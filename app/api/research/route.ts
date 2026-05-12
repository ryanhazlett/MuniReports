import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { normalizeKey, CACHE_TTL_DAYS } from "@/utils/report-cache";
import { findAcfrPdfUrl } from "@/lib/acfr-finder";

export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== Prompts =====

// Stage A (ACFR PDF URL discovery) is now handled server-side by lib/acfr-finder.ts
// — no model involved. See findAcfrPdfUrl() for the EMMA / Google / overrides flow.

// Step 1b: the ACFR is attached as a document block immediately before this text.
// Extract discrete line-items from the PDF + use web search only for external inputs.
function buildResearchPromptWithPdf(issuerName: string, issuerState: string): string {
  return `The most recent ACFR for "${issuerName}" in ${issuerState || "US"} is attached as a PDF document (above). You also have web search access for inputs that are not in the ACFR. Compile a plain-text research dossier with citations. NO JSON, NO scorecard, NO bucket assignments — the next pipeline step does scoring.

FROM THE ATTACHED ACFR — cite as "(FY___ ACFR p. ___)" using the page number printed in the PDF:

A. Cover / letter of transmittal:
   - Official issuer name and type (city / county / school district / etc.)
   - Fiscal year covered, FY-end date, release/signing date
   - Independent auditor name

B. Statement of net position — Governmental Activities column:
   - Operating revenue (program revenue + general revenue, excluding business-type)
   - Unrestricted cash and investments
   - Total long-term liabilities (governmental)
   - Available fund balance + net current assets outside the GF

C. General fund balance sheet:
   - Unassigned, committed, assigned, restricted, nonspendable fund balance
   - Cash and equivalents
   - Total fund balance

D. General fund statement of revenues, expenditures, and changes in fund balance (most recent FY):
   - Total revenue actual
   - Total expenditures actual
   - Revenue composition by source (property tax / sales tax / charges / intergovernmental / other) — $ and % of total
   - Expenditure composition by function (public safety / general gov / public works / debt service / other) — $ and % of total

E. Five-year historical trend (comparative table or trend exhibit):
   - GF revenue and expenditure totals for each of the most recent 5 fiscal years

F. Long-term liabilities footnote:
   - Tax-supported debt outstanding (governmental activities; exclude enterprise)
   - Compensated absences, claims/judgments, capital leases, other LTL
   - Total LTL governmental

G. Debt service schedule (next 10 years):
   - For each future FY: principal + interest = total
   - Per-series detail (par, coupon, maturity, CUSIP) where the bond detail table shows it

H. Pension footnote (GASB 68):
   - Plan name(s)
   - GASB Net Pension Liability (NPL)
   - Service cost (most recent FY)
   - Interest on Total Pension Liability (TPL)
   - Expected long-term return on plan assets
   - Employer contribution actual vs. ADC
   - Actuarial funded ratio (NOT market value funded ratio)

I. OPEB footnote (GASB 75):
   - GASB Net OPEB Liability (NOL)
   - OPEB contribution actual (most recent FY)
   - Funded ratio if disclosed

J. Statistical section:
   - Historic full taxable value of property (most recent year)
   - Population (most recent year)
   - Top 10 employers
   - Top 10 taxpayers
   - Property tax rate(s) per $1,000 or %, by overlapping jurisdiction

For each value, cite the printed PDF page number. If a value is genuinely not in the ACFR, write "Not in ACFR" — do NOT estimate.

FROM WEB SEARCH — external inputs not in the ACFR:

1. BEA Regional Price Parities (RPP) — most recent year, for the issuer's MSA. Cite year.
2. BEA Regional GDP — MSA real GDP, most recent 5 years (for Economic Growth metric).
3. BEA National Real GDP — most recent 5 years.
4. BLS LAUS — current unemployment rate for the issuer's MSA.
5. Census ACS 5-year — issuer MHI, US MHI, poverty rate, homeownership rate, median home value, top employers. Cite ACS vintage.
6. K-12 only: district enrollment most recent 3 fiscal years (state DOE or NCES).
7. Climate hazards (flood, wildfire, hurricane, heat) — FEMA NRI or similar. One-line description per hazard plus overall qualitative phrase ("Low" / "Moderate" / "Moderate-High" / "High").
8. Ratings — most recent Moody's / S&P / Fitch publicly disclosed (issuer IR page, EMMA, Bond Buyer).
9. Multi-year financial forecast — search issuer website for a separately-published 5-year forecast document. Cite title and date. If none, state so.
10. EMMA / Bond Buyer — recent yield / price / spread observations for outstanding series if not already captured in the ACFR bond detail table.

OUTPUT FORMAT:
- Plain text. Use section headers A–J (ACFR) then 1–10 (web).
- Cite every numeric fact: "(FY___ ACFR p. ___)" for ACFR-sourced; "(BEA RPP 2023)" / "(BLS LAUS Apr 2026)" / "(Census ACS 2019-2023 5-year)" for web-sourced.
- For values you cannot find in the ACFR or via web search, write "Not located in available public sources."
- Maximum length: about 12,000 tokens.

DO NOT produce JSON. Do NOT assign Moody's buckets. Do NOT invent peer comparisons, scenario projections, or numbers you cannot trace to either the ACFR or a cited web source.`;
}

// Step 1c (fallback): web search only, with a disclaimer preamble. Same body as the
// original buildResearchPrompt — the model is told to lead with a disclaimer that
// the ACFR PDF wasn't directly parsed.
function buildResearchPromptWebOnly(issuerName: string, issuerState: string, pdfNote: string): string {
  return `PDF FALLBACK MODE: ${pdfNote}. Begin your output with this disclaimer line, before category 1:

"ACFR PDF was not directly parsed for this report (${pdfNote}). Findings below are sourced from issuer press releases, third-party coverage, EMMA filings, and other web search results. ACFR-specific numbers (fund balance components, statement-of-net-position line items, GASB 68/75 footnote details, statistical section figures) may be incomplete; the generation step should mark unverified scorecard inputs N/A."

Then proceed with the categories below.

Research municipal finance data for "${issuerName}" in ${issuerState || "US"}. Use web search to find facts from the categories below. Return your findings as free-form text — NO JSON, NO scorecard, NO bucket assignments. Just facts, organized by category, with citations.

Cite the specific source document (with date) for every numeric fact. For EMMA filings, include the CUSIP and filing date.

CATEGORIES TO RESEARCH:

1. ACFR — most recent published Annual Comprehensive Financial Report:
   - General fund: total revenue actual, total expenditures actual, unassigned + committed + assigned fund balance, cash and investments.
   - Governmental activities (statement of net position): operating revenue, unrestricted cash and investments, available fund balance + net current assets outside the GF.
   - Statistical section: historic full value of taxable property, population, top employers, top taxpayers.
   - Debt schedule: tax-supported debt outstanding (governmental activities only — exclude enterprise/utility), debt service schedule.
   - Pension footnote: system name, GASB NPL, ANPL on Moody's-adjusted basis if disclosed, service cost, interest on TPL, expected return on plan assets, employer contribution, actuarial funded ratio.
   - OPEB footnote: GASB NOL, adjusted Net OPEB if disclosed, OPEB contributions.
   - Other long-term liabilities footnote: compensated absences, claims payable, capital leases.
   - Five most recent fiscal years of GF revenue and expenditure actuals (for trend chart).
   - Revenue composition (property tax / sales tax / charges / other) and expenditure composition (public safety / general gov / public works / debt service / other) as percentages.

2. Adopted budget — current fiscal year totals and composition.

3. Multi-year financial forecast — if the issuer publishes one. Cite the exact document title and publication date. Reproduce year-by-year revenue and expenditure VERBATIM. If none exists, state: "Not located — issuer does not appear to publish a multi-year forecast."

4. Capital Improvement Plan — total size, themes, funding mix.

5. EMMA bond filings — outstanding tax-supported series with par, coupon, maturity. For each: cite EMMA filing date and CUSIP. Recent yield/price/spread from EMMA pricing notices or Bond Buyer if available. Omit any series you cannot fully source.

6. Pension valuation — most recent actuarial valuation: system name, valuation date, actuarial funded ratio (not market), ADC vs. actual contribution.

7. OPEB valuation — most recent.

8. BEA Regional GDP for the issuer's MSA, most recent 5 fiscal years (for Economic Growth metric).

9. BEA Regional Price Parities (RPP) — most recent year, for the issuer's MSA.

10. BLS LAUS — current unemployment rate.

11. Census ACS 5-year — issuer median household income, US median household income, poverty rate, homeownership rate, median home value, top employers.

12. K-12 only (if the issuer is a public school district): district enrollment for the most recent 3 fiscal years (for Enrollment Trend CAGR), and short-term debt.

13. Climate hazards (flood, wildfire, hurricane, heat) — FEMA NRI or similar. One-line plain-English description per hazard plus an overall qualitative phrase ("Low", "Moderate", "Moderate-High", or "High").

14. Ratings — most recent Moody's, S&P, Fitch ratings if publicly disclosed.

OUTPUT FORMAT:
- Plain text. Use the category numbers above as section headers.
- Cite every numeric fact in parentheses. Example: "General fund actual revenue: $1.32B (City of Austin FY2024 ACFR, p. 28)."
- For values you cannot find after searching, write: "Not located in available public sources." Do NOT estimate, do NOT make up numbers from training data.
- Maximum length: about 8,000 tokens. Be concise but specific.

DO NOT:
- Do NOT produce JSON.
- Do NOT assign Moody's buckets (Aaa / Aa / A / etc.) — the next step does that.
- Do NOT invent peer comparisons.
- Do NOT invent multi-year forecast figures if the issuer does not publish one.
- Do NOT estimate values you cannot verify with a cited source.`;
}

// ===== Anthropic HTTP wrapper =====

// Single HTTP call to Anthropic with retry on transient errors (429 / 529 / 5xx).
async function callClaudeOnce(apiKey: string, body: any) {
  const maxAttempts = 4;
  const backoffs = [5000, 15000, 45000];
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok && !data.error) return data;

      const errType = data?.error?.type || "";
      const isRetryable =
        response.status === 429 ||
        response.status === 529 ||
        response.status >= 500 ||
        errType === "rate_limit_error" ||
        errType === "overloaded_error" ||
        errType === "api_error";

      lastError = data;
      if (!isRetryable) {
        console.error(`[research] Non-retryable error (${response.status}):`, JSON.stringify(data.error));
        return data;
      }
      if (attempt === maxAttempts - 1) {
        console.error(`[research] All ${maxAttempts} attempts exhausted.`, JSON.stringify(data.error));
        return data;
      }
      await sleep(backoffs[attempt]);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1) {
        return { error: { type: "network_error", message: String(err) } };
      }
      await sleep(backoffs[attempt]);
    }
  }
  return lastError || { error: { type: "unknown", message: "All retries failed" } };
}

// Extract concatenated text from an Anthropic message response.
function extractText(response: any): string {
  let out = "";
  if (response?.content) {
    for (const block of response.content) {
      if (block?.type === "text") out += block.text;
    }
  }
  return out;
}

// Generic pause_turn loop. Builds the request body for each iteration via
// `buildBody(messages)`; on pause_turn appends the assistant's content verbatim
// and continues. Returns the final response (or an error envelope).
async function runPauseTurnLoop(
  apiKey: string,
  initialUserContent: any,
  buildBody: (messages: Array<{ role: "user" | "assistant"; content: any }>) => any,
  maxLoops: number = 10
): Promise<any> {
  const messages: Array<{ role: "user" | "assistant"; content: any }> = [
    { role: "user", content: initialUserContent },
  ];
  let last: any = null;

  for (let loop = 0; loop < maxLoops; loop++) {
    const body = buildBody(messages);
    const response = await callClaudeOnce(apiKey, body);
    if (response?.error) return response;
    last = response;

    if (response?.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    return response;
  }

  console.error(`[research] hit pause_turn loop limit (${maxLoops}).`);
  return last || { error: { type: "loop_exhausted", message: "pause_turn continuations exceeded loop limit" } };
}

// ===== Stage B: HEAD-validate the PDF URL =====

const MAX_PDF_BYTES = 32 * 1024 * 1024;

async function validatePdfUrl(
  url: string
): Promise<{ ok: true; bytes: number; contentType: string } | { ok: false; reason: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return { ok: false, reason: `HEAD ${response.status}` };
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/pdf")) {
      return { ok: false, reason: `Content-Type was ${contentType || "missing"}` };
    }
    const lenHeader = response.headers.get("content-length");
    if (!lenHeader) return { ok: false, reason: "Content-Length missing" };
    const bytes = parseInt(lenHeader, 10);
    if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, reason: "Content-Length unparseable" };
    if (bytes > MAX_PDF_BYTES) {
      const mb = (bytes / (1024 * 1024)).toFixed(1);
      return { ok: false, reason: `size ${mb}MB exceeds 32MB cap` };
    }
    return { ok: true, bytes, contentType };
  } catch (err: any) {
    if (err?.name === "AbortError") return { ok: false, reason: "validation timeout (10s)" };
    return { ok: false, reason: `HEAD error: ${String(err?.message || err)}` };
  }
}

// ===== Stage C: full research with PDF document attached =====

async function callResearchWithPdf(
  apiKey: string,
  issuerName: string,
  issuerState: string,
  pdfUrl: string
): Promise<{ findings?: string; error?: any; usage?: any; stop_reason?: string }> {
  const prompt = buildResearchPromptWithPdf(issuerName, issuerState);
  const initial = [
    { type: "document", source: { type: "url", url: pdfUrl } },
    { type: "text", text: prompt },
  ];

  const response = await runPauseTurnLoop(
    apiKey,
    initial,
    (messages) => ({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      temperature: 0.1,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
      messages,
    }),
    10
  );

  if (response?.error) return { error: response.error, usage: response?.usage };
  return {
    findings: extractText(response),
    usage: response?.usage,
    stop_reason: response?.stop_reason,
  };
}

// ===== Stage C-fallback: web search only =====

async function callResearchWebOnly(
  apiKey: string,
  issuerName: string,
  issuerState: string,
  pdfNote: string
): Promise<{ findings?: string; error?: any; usage?: any; stop_reason?: string }> {
  const prompt = buildResearchPromptWebOnly(issuerName, issuerState, pdfNote);
  const response = await runPauseTurnLoop(
    apiKey,
    prompt,
    (messages) => ({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      temperature: 0.1,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
      messages,
    }),
    10
  );

  if (response?.error) return { error: response.error, usage: response?.usage };
  return {
    findings: extractText(response),
    usage: response?.usage,
    stop_reason: response?.stop_reason,
  };
}

// ===== Orchestrator =====

type ResearchResult = {
  findings?: string;
  pdfUsed: boolean;
  pdfUrl?: string;
  pdfNote?: string;
  error?: any;
  usage?: any;
  stop_reason?: string;
};

// Detect Anthropic errors that indicate the PDF was too large or too many pages.
// We don't have a stable error code; pattern-match the message defensively.
function isPdfOverflowError(err: any): boolean {
  const msg = String(err?.message || err?.type || "").toLowerCase();
  return (
    msg.includes("page") && (msg.includes("limit") || msg.includes("exceed") || msg.includes("too many"))
  ) || msg.includes("too large") || msg.includes("payload") || msg.includes("max tokens") && msg.includes("context");
}

async function callResearch(
  apiKey: string,
  issuerName: string,
  issuerState: string
): Promise<ResearchResult> {
  // Stage A: locate the ACFR PDF URL — server-side, no model. Order:
  //   1. ACFR_OVERRIDES map  2. EMMA Official Statements  3. EMMA Continuing Disclosures
  //   4. Google filetype:pdf
  const finder = await findAcfrPdfUrl(issuerName, issuerState);
  console.log(`[research] acfr-finder: source=${finder.source} url=${finder.url ?? "null"} note="${finder.note}"`);

  if (!finder.url) {
    const note = finder.note || "URL not surfaced";
    const r = await callResearchWebOnly(apiKey, issuerName, issuerState, note);
    return {
      findings: r.findings,
      error: r.error,
      usage: r.usage,
      stop_reason: r.stop_reason,
      pdfUsed: false,
      pdfNote: note,
    };
  }

  // Stage B: HEAD validate (enforces 32MB cap; the finder did a basic existence check
  // but does not check size).
  const validation = await validatePdfUrl(finder.url);
  if (!validation.ok) {
    const note = `${validation.reason} (finder source: ${finder.source})`;
    console.log(`[research] Stage B rejected: ${note} url=${finder.url}`);
    const r = await callResearchWebOnly(apiKey, issuerName, issuerState, note);
    return {
      findings: r.findings,
      error: r.error,
      usage: r.usage,
      stop_reason: r.stop_reason,
      pdfUsed: false,
      pdfUrl: finder.url,
      pdfNote: note,
    };
  }

  // Stage C: research with PDF attached.
  console.log(`[research] PDF parsed (${(validation.bytes / (1024 * 1024)).toFixed(1)}MB, source: ${finder.source}) from ${finder.url}`);
  const r = await callResearchWithPdf(apiKey, issuerName, issuerState, finder.url);

  // Detect page-count / payload overflow → fall back.
  if (r.error && isPdfOverflowError(r.error)) {
    const note = `page-count overflow (finder source: ${finder.source})`;
    console.log(`[research] PDF fallback after overflow: ${note} url=${finder.url}`);
    const fb = await callResearchWebOnly(apiKey, issuerName, issuerState, note);
    return {
      findings: fb.findings,
      error: fb.error,
      usage: fb.usage,
      stop_reason: fb.stop_reason,
      pdfUsed: false,
      pdfUrl: finder.url,
      pdfNote: note,
    };
  }

  return {
    findings: r.findings,
    error: r.error,
    usage: r.usage,
    stop_reason: r.stop_reason,
    pdfUsed: !r.error,
    pdfUrl: finder.url,
    pdfNote: r.error
      ? undefined
      : `PDF parsed (${(validation.bytes / (1024 * 1024)).toFixed(1)}MB, source: ${finder.source})`,
  };
}

// ===== POST handler =====

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState, forceRefresh } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    const supabase = await createClient();

    const cacheKey = normalizeKey(issuerName, issuerState);

    // Cache lookup: if a fresh full report exists, short-circuit step 2.
    if (!forceRefresh && cacheKey && cacheKey !== "|") {
      try {
        const { data: cached } = await supabase
          .from("cached_reports")
          .select("report_data, generated_at")
          .eq("issuer_key", cacheKey)
          .maybeSingle();

        if (cached) {
          const ageMs = Date.now() - new Date(cached.generated_at).getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          if (ageDays < CACHE_TTL_DAYS) {
            console.log(`[research] Cache hit: ${cacheKey} (age ${ageDays.toFixed(1)}d)`);
            return NextResponse.json({
              cached: true,
              report: cached.report_data,
              generatedAt: cached.generated_at,
            });
          }
        }
      } catch (cacheErr) {
        console.warn("[research] Cache lookup failed (non-fatal):", cacheErr);
      }
    }

    const research = await callResearch(apiKey, issuerName, issuerState);
    if (research.error) {
      console.error("[research] failed:", JSON.stringify(research.error));
      return NextResponse.json({ error: research.error.message || "Research failed" }, { status: 500 });
    }

    const findings = research.findings || "";
    if (findings.length < 500) {
      console.error("[research] insufficient findings " + JSON.stringify({
        issuer: cacheKey,
        text_length: findings.length,
        text_head: findings.slice(0, 500),
        stop_reason: research.stop_reason ?? null,
        usage: research.usage ?? null,
        pdfUsed: research.pdfUsed,
        pdfNote: research.pdfNote ?? null,
      }));
      return NextResponse.json({ error: "Research phase returned no usable findings" }, { status: 500 });
    }

    return NextResponse.json({
      cached: false,
      findings,
      pdfUsed: research.pdfUsed,
      pdfUrl: research.pdfUrl ?? null,
      pdfNote: research.pdfNote ?? null,
      stop_reason: research.stop_reason ?? null,
      usage: research.usage ?? null,
    });
  } catch (error) {
    console.error("[research] route error:", error);
    return NextResponse.json({ error: "Research route failed" }, { status: 500 });
  }
}
