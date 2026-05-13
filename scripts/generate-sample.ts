#!/usr/bin/env node
// Usage: npx tsx scripts/generate-sample.ts "City of Austin" "TX"
//
// Calls /api/find-acfr → /api/read-acfr → /api/generate sequentially against
// the local Next.js dev server. Writes the final report JSON to
// samples/<slug>.json. Run from the repo root with `npm run dev` already
// running and ANTHROPIC_API_KEY + BRAVE_API_KEY + Supabase env vars present
// in .env.local. Override the base URL via MUNIREPORTS_BASE_URL if needed.

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
  const findUrl = `${baseUrl}/api/find-acfr`;
  const readUrl = `${baseUrl}/api/read-acfr`;
  const generateUrl = `${baseUrl}/api/generate`;

  const slug = (issuerName + "-" + issuerState)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const outPath = resolve(process.cwd(), "samples", `${slug}.json`);

  console.log(`Generating sample report for "${issuerName}, ${issuerState}"...`);
  console.log(`Output: ${outPath}`);

  const startedAt = Date.now();

  // Step 1: find-acfr (cache lookup + URL discovery + HEAD validation).
  console.log(`Step 1/3: find-acfr (${findUrl})...`);
  const t1 = Date.now();
  const d1 = await postJSON(findUrl, { issuerName, issuerState, forceRefresh: true });
  const dt1 = ((Date.now() - t1) / 1000).toFixed(1);

  let finalData: any;

  if (d1.cached) {
    console.log(`  find: ${dt1}s (cache hit). Skipping steps 2-3.`);
    finalData = { report: d1.report, cached: true, generatedAt: d1.generatedAt };
  } else {
    const pdfUrl = d1.attachable ? d1.pdfUrl : null;
    console.log(
      `  find: ${dt1}s pdfUrl=${d1.pdfUrl ?? "null"} pdfSource=${d1.pdfSource ?? "null"} ` +
        `pdfBytes=${d1.pdfBytes ?? "null"} attachable=${d1.attachable} note="${d1.note}"`
    );

    // Step 2: read-acfr (PDF-attached or web-only).
    console.log(`Step 2/3: read-acfr (${readUrl})${pdfUrl ? " [PDF mode]" : " [web-only mode]"}...`);
    const t2 = Date.now();
    const d2 = await postJSON(readUrl, {
      issuerName,
      issuerState,
      pdfUrl,
      pdfNote: d1.note,
    });
    const dt2 = ((Date.now() - t2) / 1000).toFixed(1);
    const findings: string = d2.findings || "";
    console.log(
      `  read: ${dt2}s pdfUsed=${d2.pdfUsed} findings_length=${findings.length} ` +
        `stop_reason=${d2.stop_reason ?? "null"}`
    );

    // Step 3: generate the structured JSON report.
    console.log(`Step 3/3: generate (${generateUrl})...`);
    const t3 = Date.now();
    const d3 = await postJSON(generateUrl, {
      issuerName,
      issuerState,
      findings,
      forceRefresh: true,
    });
    const dt3 = ((Date.now() - t3) / 1000).toFixed(1);
    console.log(`  generate: ${dt3}s savedId=${d3.savedId ?? "null"}`);

    finalData = {
      report: d3.report,
      cached: false,
      generatedAt: d3.generatedAt,
      savedId: d3.savedId,
      pdf: {
        url: d1.pdfUrl,
        source: d1.pdfSource,
        bytes: d1.pdfBytes,
        attachable: d1.attachable,
        used: d2.pdfUsed,
      },
    };
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(finalData, null, 2));

  const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done in ${totalElapsed}s total.`);
}

main().catch((err) => {
  console.error("Request failed:", err);
  process.exit(1);
});
