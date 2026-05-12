#!/usr/bin/env node
// Usage: npx tsx scripts/generate-sample.ts "City of Austin" "TX"
//
// Calls /api/research then /api/generate sequentially against the local Next.js
// dev server. Writes the final report JSON to samples/<slug>.json. Run from
// the repo root with `npm run dev` already running and ANTHROPIC_API_KEY +
// Supabase env vars present in .env.local. Override the base URL via
// MUNIREPORTS_BASE_URL if needed.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

async function postJSON(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
  }
  return res.json();
}

async function main(): Promise<void> {
  const [, , issuerName, issuerState] = process.argv;

  if (!issuerName || !issuerState) {
    console.error('Usage: generate-sample.ts "<issuer name>" "<state code>"');
    console.error('Example: generate-sample.ts "City of Austin" "TX"');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set in environment.");
    console.error("The dev server's /api/* routes need it; ensure .env.local is loaded.");
    process.exit(1);
  }

  const baseUrl = process.env.MUNIREPORTS_BASE_URL || "http://localhost:3000";
  const researchUrl = `${baseUrl}/api/research`;
  const generateUrl = `${baseUrl}/api/generate`;

  const slug = (issuerName + "-" + issuerState)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const outPath = resolve(process.cwd(), "samples", `${slug}.json`);

  console.log(`Generating sample report for "${issuerName}, ${issuerState}"...`);
  console.log(`Output: ${outPath}`);

  const startedAt = Date.now();

  // Step 1: research (with forceRefresh to bypass the 90-day cache).
  console.log(`Step 1/2: research (${researchUrl})...`);
  const r1Started = Date.now();
  const d1 = await postJSON(researchUrl, { issuerName, issuerState, forceRefresh: true });
  const r1Elapsed = ((Date.now() - r1Started) / 1000).toFixed(1);

  let finalData: any;

  if (d1.cached) {
    console.log(`  Cache hit (${r1Elapsed}s). Skipping step 2.`);
    finalData = { report: d1.report, cached: true, generatedAt: d1.generatedAt };
  } else {
    const findings = d1.findings || "";
    console.log(`  Research done in ${r1Elapsed}s. Findings: ${findings.length} chars. stop_reason=${d1.stop_reason}`);

    // Step 2: generation.
    console.log(`Step 2/2: generate (${generateUrl})...`);
    const r2Started = Date.now();
    const d2 = await postJSON(generateUrl, { issuerName, issuerState, findings, forceRefresh: true });
    const r2Elapsed = ((Date.now() - r2Started) / 1000).toFixed(1);
    console.log(`  Generation done in ${r2Elapsed}s.`);
    finalData = d2;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(finalData, null, 2));

  const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done in ${totalElapsed}s total. Cached: ${finalData.cached ?? false}.`);
}

main().catch((err) => {
  console.error("Request failed:", err);
  process.exit(1);
});
