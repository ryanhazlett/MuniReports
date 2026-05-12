#!/usr/bin/env node
// Usage: npx tsx scripts/generate-sample.ts "City of Austin" "TX"
// Or:    node --experimental-strip-types scripts/generate-sample.ts "City of Austin" "TX" (Node 22.6+)
//
// Hits the local Next.js /api/generate-report endpoint and writes the JSON report to
// samples/<slug>.json. Requires the dev server to be running (npm run dev) and
// ANTHROPIC_API_KEY to be present in the server's environment (.env.local).

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outPath = resolve(__dirname, "..", "samples", `${slug}.json`);

console.log(`Generating sample report for "${issuerName}, ${issuerState}"...`);
console.log(`Endpoint: ${endpoint}`);
console.log(`Output:   ${outPath}`);

const startedAt = Date.now();

try {
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
} catch (err) {
  console.error("Request failed:", err);
  process.exit(1);
}
