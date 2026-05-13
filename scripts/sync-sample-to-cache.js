#!/usr/bin/env node
// Sync samples/<slug>.json → Supabase cached_reports row.
//
// Usage: node scripts/sync-sample-to-cache.js austin
//
// Reads samples/<slug>.json, extracts the `.report` object, derives the
// issuer_key (via the same normalizeKey convention as utils/report-cache.ts),
// and upserts the row in `cached_reports` keyed by issuer_key.
//
// Env vars (loaded from .env.local in repo root if not already set):
//   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (required for the upsert — bypasses RLS)

const fs = require("node:fs");
const path = require("node:path");

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// Minimal .env parser: only sets keys that aren't already in process.env.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

function normalizeKey(name, state) {
  return `${(name || "").trim().toLowerCase()}|${(state || "").trim().toLowerCase()}`;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    fail(
      "Usage: node scripts/sync-sample-to-cache.js <slug>\n" +
        "  e.g.: node scripts/sync-sample-to-cache.js austin\n" +
        "  Reads samples/<slug>.json"
    );
  }

  // Load .env.local if env vars not already set (e.g., when not run via Next).
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL) {
    fail(
      "Neither SUPABASE_URL nor NEXT_PUBLIC_SUPABASE_URL is set.\n" +
        "  Add it to .env.local at the repo root, or export it before running."
    );
  }
  if (!SERVICE_KEY) {
    fail(
      "SUPABASE_SERVICE_ROLE_KEY is not set.\n" +
        "  Required to bypass RLS on cached_reports for upsert.\n" +
        "  Get it from Supabase Dashboard → Project Settings → API → service_role key.\n" +
        "  Add it to .env.local at the repo root."
    );
  }

  const samplePath = path.resolve(process.cwd(), "samples", `${slug}.json`);
  if (!fs.existsSync(samplePath)) fail(`Sample file not found: ${samplePath}`);

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  } catch (e) {
    fail(`Failed to parse ${samplePath}: ${e.message}`);
  }

  const report = payload.report;
  if (!report) fail(`${samplePath} has no top-level "report" object`);
  if (!report.issuer_name || !report.state) {
    fail(
      `${samplePath} report is missing issuer_name or state.\n` +
        `  Found: issuer_name=${JSON.stringify(report.issuer_name)} state=${JSON.stringify(report.state)}`
    );
  }

  // issuer_key: prefer one already in the JSON; otherwise derive.
  const issuerKey =
    payload.issuer_key ||
    report.issuer_key ||
    normalizeKey(report.issuer_name, report.state);

  let createClient;
  try {
    ({ createClient } = require("@supabase/supabase-js"));
  } catch {
    fail(
      "@supabase/supabase-js not installed. Run `npm install` first."
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Syncing samples/${slug}.json → cached_reports`);
  console.log(`  issuer_key:  ${issuerKey}`);
  console.log(`  issuer:      ${report.issuer_name}, ${report.state}`);

  const generatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("cached_reports")
    .upsert(
      {
        issuer_key: issuerKey,
        issuer_name: report.issuer_name,
        state: report.state,
        report_data: report,
        generated_at: generatedAt,
      },
      { onConflict: "issuer_key" }
    )
    .select("*")
    .single();

  if (error) {
    fail(
      `Supabase upsert failed: ${error.message}\n` +
        `  code: ${error.code}\n` +
        `  details: ${error.details || "(none)"}\n` +
        `  hint: ${error.hint || "(none)"}\n` +
        `  full: ${JSON.stringify(error)}`
    );
  }

  console.log("\nSUCCESS — row upserted.");
  console.log(`  issuer_key:   ${data.issuer_key}`);
  if (data.generated_at) console.log(`  generated_at: ${data.generated_at}`);
  if (data.updated_at) console.log(`  updated_at:   ${data.updated_at}`);
  else console.log(`  updated_at:   (column not present in table)`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
