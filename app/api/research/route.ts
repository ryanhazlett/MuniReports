import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { normalizeKey, CACHE_TTL_DAYS } from "@/utils/report-cache";

export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Step 1 prompt: gather facts via web search, return as plain-text dossier.
// No JSON, no scoring — that's step 2's job. This call carries the web_search
// tool budget; keep its scope tight to keep latency under the function timeout.
function buildResearchPrompt(issuerName: string, issuerState: string): string {
  return `Research municipal finance data for "${issuerName}" in ${issuerState || "US"}. Use web search to find facts from the categories below. Return your findings as free-form text — NO JSON, NO scorecard, NO bucket assignments. Just facts, organized by category, with citations.

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

// Single HTTP call to Anthropic with retry on transient errors (429 / 529 / 5xx).
async function callClaudeOnce(apiKey: string, body: any) {
  const maxAttempts = 4;
  const backoffs = [3000, 8000, 20000];
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

// Drives the server-side tool loop. web_search_20250305 is server-executed;
// stop_reason "pause_turn" means the model isn't done — echo the assistant
// content verbatim and call again.
// Docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#the-server-side-loop-and-pause-turn
async function callResearch(
  apiKey: string,
  issuerName: string,
  issuerState: string
): Promise<{ findings?: string; error?: any; usage?: any; stop_reason?: string }> {
  const prompt = buildResearchPrompt(issuerName, issuerState);
  const messages: Array<{ role: "user" | "assistant"; content: any }> = [
    { role: "user", content: prompt },
  ];

  const MAX_PAUSE_LOOPS = 10;
  let last: any = null;

  for (let loop = 0; loop < MAX_PAUSE_LOOPS; loop++) {
    const body: any = {
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      temperature: 0.1,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
      messages,
    };

    const response = await callClaudeOnce(apiKey, body);
    if (response?.error) return { error: response.error };
    last = response;

    if (response?.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    let findings = "";
    if (response?.content) {
      for (const block of response.content) {
        if (block.type === "text") findings += block.text;
      }
    }
    return { findings, usage: response?.usage, stop_reason: response?.stop_reason };
  }

  console.error(`[research] hit pause_turn loop limit (${MAX_PAUSE_LOOPS}).`);
  return {
    error: { type: "loop_exhausted", message: "research pause_turn continuations exceeded loop limit" },
    usage: last?.usage,
  };
}

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
      }));
      return NextResponse.json({ error: "Research phase returned no usable findings" }, { status: 500 });
    }

    return NextResponse.json({
      cached: false,
      findings,
      stop_reason: research.stop_reason ?? null,
      usage: research.usage ?? null,
    });
  } catch (error) {
    console.error("[research] route error:", error);
    return NextResponse.json({ error: "Research route failed" }, { status: 500 });
  }
}
