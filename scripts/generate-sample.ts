#!/usr/bin/env node
// Usage: npx tsx scripts/generate-sample.ts "City of Austin" "TX"
//
// Hits the local Next.js /api/generate-report endpoint and writes the JSON report
// to samples/<slug>.json. Run from the repo root with the dev server already
// running (npm run dev) and ANTHROPIC_API_KEY present in the server's environment
// (.env.local). Override the endpoint via MUNIREPORTS_API_URL if needed.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

async function main(): Promise<void> {
  const [, , issuerName, issuerState] = process.argv;

  if (!issuerName || !issuerState) {
    console.error('Usage: generate-sample.ts "<issuer name>" "<state code>"');
    console.error('Example: generate-sample.ts "City of Austin" "TX"');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set in environment.");
    console.error("The /api/generate-report route needs it to call Anthropic; the dev server must also have it loaded (.env.local).");
    process.exit(1);
  }

  const endpoint = process.env.MUNIREPORTS_API_URL || "http://localhost:3000/api/generate-report";

  const slug = (issuerName + "-" + issuerState)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const outPath = resolve(process.cwd(), "samples", `${slug}.json`);

  console.log(`Generating sample report for "${issuerName}, ${issuerState}"...`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Output:   ${outPath}`);

  const startedAt = Date.now();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issuerName, issuerState, forceRefresh: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`HTTP ${res.status}: ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s. Cached: ${data.cached ?? false}.`);
}

main().catch((err) => {
  console.error("Request failed:", err);
  process.exit(1);
});
