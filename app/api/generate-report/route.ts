import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// TODO: Add server-side paywall enforcement. Currently /api/generate-report is open to anyone
// who can hit the endpoint directly. Tracked separately from owner-bypass work.

export const maxDuration = 300;

const CACHE_TTL_DAYS = 90;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function normalizeKey(name: string, state: string): string {
  return `${(name || "").trim().toLowerCase()}|${(state || "").trim().toLowerCase()}`;
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
        console.error(`Non-retryable error (${response.status}):`, JSON.stringify(data.error));
        return data;
      }
      if (attempt === maxAttempts - 1) {
        console.error(`All ${maxAttempts} attempts exhausted.`, JSON.stringify(data.error));
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

// Drives the server-side tool loop. web_search_20250305 is server-executed:
// Anthropic returns server_tool_use + web_search_tool_result blocks inline and
// uses stop_reason "pause_turn" to ask us to continue the turn. We echo the
// assistant content back verbatim and call again until stop_reason !== pause_turn.
// Docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools#the-server-side-loop-and-pause-turn
async function callClaude(apiKey: string, prompt: string) {
  const messages: Array<{ role: "user" | "assistant"; content: any }> = [
    { role: "user", content: prompt },
  ];

  const MAX_PAUSE_LOOPS = 10;
  let last: any = null;

  for (let loop = 0; loop < MAX_PAUSE_LOOPS; loop++) {
    const body: any = {
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      temperature: 0.1,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    };

    const response = await callClaudeOnce(apiKey, body);

    // Hard API failure (after retries) — surface immediately.
    if (response?.error) return response;

    last = response;

    if (response?.stop_reason === "pause_turn") {
      // Continue the turn: append assistant's content (including server_tool_use
      // and web_search_tool_result blocks) verbatim and call again.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    // end_turn, max_tokens, stop_sequence, refusal, etc. — return the final turn.
    return response;
  }

  console.error(`callClaude: hit pause_turn loop limit (${MAX_PAUSE_LOOPS}).`);
  return last || { error: { type: "loop_exhausted", message: "pause_turn continuations exceeded loop limit" } };
}

function extractJSON(data: any): any {
  let text = "";
  if (data?.content) {
    for (const block of data.content) {
      if (block.type === "text") text += block.text;
    }
  }
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      let j = match[0];
      let ob = (j.match(/\{/g) || []).length;
      let cb = (j.match(/\}/g) || []).length;
      let oq = (j.match(/\[/g) || []).length;
      let cq = (j.match(/\]/g) || []).length;
      while (cq < oq) { j += "]"; cq++; }
      while (cb < ob) { j += "}"; cb++; }
      j = j.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
      return JSON.parse(j);
    }
  } catch (e) {
    console.error("JSON parse error:", e, "Text length:", text.length);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState, forceRefresh } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    const supabase = await createClient();

    const cacheKey = normalizeKey(issuerName, issuerState);

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
            console.log(`Cache hit: ${cacheKey} (age ${ageDays.toFixed(1)}d)`);
            return NextResponse.json({
              report: cached.report_data,
              cached: true,
              generatedAt: cached.generated_at,
            });
          }
        }
      } catch (cacheErr) {
        console.warn("Cache lookup failed (non-fatal):", cacheErr);
      }
    }

    const prompt = `Search the web for "${issuerName}" in ${issuerState || "US"}. Find their most recent published Annual Comprehensive Financial Report (ACFR), adopted budget, capital improvement plan (CIP), EMMA bond filings, pension actuarial valuations, OPEB valuations, the issuer's own published multi-year financial forecast (if any), and economic data from BEA/BLS/Census/state sources. Then return ONLY valid JSON. NO markdown. NO backticks. NO explanation outside the JSON.

============================================================
HARD RULES — DO NOT VIOLATE:
============================================================
1. NEVER fabricate peer comparison data. Peer comparison has been removed from the schema; do not generate one. If you don't have audited numbers from a peer's ACFR, you do not have a peer.
2. NEVER invent forward-looking scenario numbers, baselines, or stress cases. Populate the forecast section ONLY with figures from the issuer's own published multi-year financial forecast (verbatim). If the issuer does not publish one, set forecast.source = "N/A — issuer does not publish a multi-year forecast" and leave the forecast arrays empty.
3. NEVER cite a bond CUSIP, par amount, coupon, maturity, yield, price, or spread you cannot trace to a specific EMMA filing or Bond Buyer reporting that appears in your search results. Omit any bond entry you cannot fully source — do not estimate.
4. If a required Moody's scorecard input is unavailable in public sources, mark the field as "N/A — disclosure not available" and set its bucket to "N/A". Do not interpolate, estimate, or proxy from memory.
5. Every numeric claim in the report must trace to a source cited in the Sources section. Do not introduce numbers in narrative sections that do not also appear (with a source) in the structured data.

============================================================
DEFINITIONS — USE THESE EXACTLY (do not improvise):
============================================================
- total_revenue: GENERAL FUND actual total revenue from the most recent FISCAL YEAR ACTUAL in the ACFR. Not budget. Not all-funds. Not enterprise.
- total_expenditures: GENERAL FUND actual total expenditures from the most recent FISCAL YEAR ACTUAL in the ACFR.
- operating_revenue (used as denominator for Moody's scorecard ratios): Operating Revenue of governmental activities per Moody's definition — generally GF + special revenue + debt service funds, excluding enterprise. Source: ACFR statement of activities for governmental activities. NOTE: This is different from the GF-only total_revenue figure above; do not confuse them.
- fund_balance: UNASSIGNED general fund balance per the most recent ACFR balance sheet. NOT total fund balance.
- fund_balance_ratio: (unassigned GF balance) / (GF total expenditures) × 100, expressed as "XX.X%"
- available_reserves: SUM of unassigned + committed + assigned general fund balance per ACFR. Integer dollars.
- available_reserves_ratio: available_reserves / GF expenditures × 100, expressed as "XX.X%"
- operating_margin: (GF revenue − GF expenditures) / GF revenue × 100, expressed as "X.X%"
- debt_outstanding: TAX-SUPPORTED debt (governmental activities), EXCLUDING enterprise/utility revenue debt and component units. Latest ACFR debt schedule.
- debt_per_capita: debt_outstanding / population, formatted "$X,XXX"
- days_cash_on_hand: (GF cash & equivalents × 365) / GF expenditures, integer
- revenue_trend / expenditure_trend: GF ACTUAL totals from each year's ACFR. Five years FY2021–FY2025 if available.
- revenue_composition / expenditure_composition: percentages of GENERAL FUND only.

============================================================
ISSUER-TYPE ROUTING (determine first):
============================================================
- Cities, counties, towns, villages, general-purpose municipal governments → apply Section A (US Cities and Counties Rating Methodology, Moody's Investors Service, July 24, 2024).
- K-12 public school districts → apply Section B (US K-12 Public School Districts Rating Methodology, Moody's Investors Service, July 24, 2024).
- Utilities, special districts, or other issuer types not covered by these two methodologies → set scorecard.applicable = false and scorecard.note = "Moody's published methodology for this issuer type is not implemented; scorecard omitted." Do NOT compute the scorecard for these issuers.

============================================================
SECTION A — US CITIES AND COUNTIES SCORECARD (Moody's, July 24, 2024):
============================================================
Compute 7 sub-factors across 4 factors. For each sub-factor return: value (formatted as specified), bucket (one of Aaa / Aa / A / Baa / Ba / B / Caa / Ca / "N/A"), interpretation (one-line plain-English read), and inputs (the specific numerator/denominator values used).

FACTOR 1 — ECONOMY (weight 30%; three sub-factors at 10% each):

  1.1 Resident Income (10%):
      Formula: (Adjusted MHI) / (US MHI)
        where Adjusted MHI = Issuer MHI × (100 / RPP for the issuer's MSA)
      Inputs: ACS 5-year MHI (issuer + US); BEA Regional Price Parities for issuer's MSA.
      Value format: "XX%" (of US MHI on RPP-adjusted basis)

  1.2 Full Value per Capita (10%):
      Formula: Full Value of Taxable Property / Population
      Inputs: ACFR statistical section (historic full value table); Census/ACS population.
      Value format: "$X,XXX"

  1.3 Economic Growth Metric (10%):
      Formula: (5-year CAGR of MSA Real GDP) − (5-year CAGR of US Real GDP)
      Inputs: BEA Regional GDP (MSA); BEA National GDP; most recent 5 years available.
      Value format: "X.X pp" (percentage points)

FACTOR 2 — FINANCIAL PERFORMANCE (weight 30%; two sub-factors at 15% each):

  2.1 Available Fund Balance Ratio (15%):
      Formula: (Available Fund Balance + Net Current Assets of Governmental Activities outside the GF) / Operating Revenue
      Inputs: ACFR balance sheet; governmental activities statement of net position.
      Value format: "XX.X%"

  2.2 Liquidity Ratio (15%):
      Formula: Unrestricted Cash and Investments (Governmental Activities) / Operating Revenue
      Inputs: ACFR cash and investments footnote.
      Value format: "XX.X%"

FACTOR 3 — INSTITUTIONAL FRAMEWORK (weight 10%, qualitative):

  Assign one of Aaa / Aa / A / Baa / Ba / B based on Moody's most recent state-level Institutional Framework assessment for the issuer's state. If the state-level assessment is not surfaced by your search, set value = "N/A — state-level institutional framework not available" and bucket = "N/A".

FACTOR 4 — LEVERAGE (weight 30%; two sub-factors at 15% each):

  4.1 Long-Term Liabilities Ratio (15%):
      Formula: (Debt + Adjusted Net Pension Liability + Adjusted Net OPEB Liability + Other LTL) / Operating Revenue
      Inputs:
        - Debt: tax-supported debt of governmental activities; exclude enterprise debt.
        - ANPL: Moody's-adjusted basis if disclosed; otherwise GASB-reported NPL — flag "GASB basis (Moody's adjustment not available)" in interpretation.
        - Adjusted Net OPEB: same convention as ANPL.
        - Other LTL: compensated absences, claims payable, capital leases, etc., from ACFR long-term liabilities footnote.
      Value format: "XX.X%"

  4.2 Fixed-Costs Ratio (15%):
      Formula: (Implied Debt Service + Pension Tread-Water Contribution + OPEB Contributions + Implied Carrying Costs of Other LTL) / Operating Revenue
      Inputs:
        - Implied debt service: level debt service on outstanding tax-supported debt at the current effective rate.
        - Pension tread-water: service cost + interest on TPL − expected return on plan assets (i.e., contribution required to prevent NPL growth), from ACFR pension footnote.
        - OPEB contributions: most recent actual contribution from ACFR OPEB footnote.
        - Implied carrying costs of other LTL: amortization of other LTL on the same convention as debt.
      Value format: "XX.X%"

(Threshold bucket mapping for all Section A sub-factors is defined below in PUBLISHED THRESHOLD TABLES.)

============================================================
SECTION B — US K-12 PUBLIC SCHOOL DISTRICTS SCORECARD (Moody's, July 24, 2024):
============================================================
Same 30/30/10/30 factor weighting as Section A, with these substitutions:

- Sub-factor 1.1 Resident Income: same as Section A.
- Sub-factor 1.2 Full Value per Capita: same as Section A.
- Sub-factor 1.3 Economic Growth Metric → REPLACED by Enrollment Trend = 3-year CAGR of district K-12 enrollment, from state DOE or NCES; format "X.X%".
- Sub-factor 2.1 Available Fund Balance Ratio → numerator is GF-only Available Fund Balance (NOT including net current assets outside the GF as in Section A); formula = Available Fund Balance / Operating Revenue; format "XX.X%".
- Sub-factor 2.2 Liquidity Ratio → REPLACED by Net Cash Ratio = (Unrestricted Cash − Short-Term Debt) / Operating Revenue; format "XX.X%".
- Sub-factor 4.1 Long-Term Liabilities Ratio → numerator EXCLUDES Other LTL (K-12 convention); formula = (Debt + ANPL + Adjusted Net OPEB) / Operating Revenue; format "XX.X%".
- Sub-factor 4.2 Fixed-Costs Ratio: same formula as Section A but with the K-12 threshold table below.
- Institutional Framework: same as Section A.

(Threshold bucket mapping for all Section B sub-factors is defined below in PUBLISHED THRESHOLD TABLES.)

============================================================
PUBLISHED THRESHOLD TABLES — APPLY EXACTLY:
============================================================
Map each computed sub-factor value to a bucket using the tables below. These are the published Moody's scorecard thresholds (July 24, 2024). Do NOT improvise or interpolate the boundary positions; do NOT consult memory; do NOT search the web for thresholds — use ONLY the tables below. Range notation: "X–Y" means the bucket covers values from X (inclusive of the lower bound) up to but not including Y, except where bounded explicitly with ≥ or ≤. Where a value falls exactly on a boundary, assign it to the higher (better) bucket.

CITIES AND COUNTIES SCORECARD THRESHOLDS:

Resident Income (Adjusted MHI / US MHI):
  Aaa: ≥120%      | Aa: 100–120%   | A: 80–100%     | Baa: 65–80%
  Ba: 50–65%      | B: 35–50%      | Caa: 20–35%    | Ca: <20%

Full Value per Capita (Full Value / Population):
  Aaa: ≥$180,000          | Aa: $100,000–$180,000  | A: $60,000–$100,000   | Baa: $40,000–$60,000
  Ba: $25,000–$40,000     | B: $15,000–$25,000     | Caa: $9,000–$15,000   | Ca: <$9,000

Economic Growth (5-yr MSA Real GDP CAGR − 5-yr US Real GDP CAGR, in percentage points):
  Aaa: ≥0 pp      | Aa: −1 to 0 pp     | A: −2.5 to −1 pp   | Baa: −4.5 to −2.5 pp
  Ba: −7 to −4.5 pp | B: −10 to −7 pp   | Caa: −15 to −10 pp | Ca: <−15 pp

Available Fund Balance Ratio ((Available FB + Net Current Assets) / Operating Revenue):
  Aaa: ≥35%       | Aa: 25–35%     | A: 15–25%      | Baa: 5–15%
  Ba: 0–5%        | B: −5 to 0%    | Caa: −10 to −5%| Ca: <−10%

Liquidity Ratio (Unrestricted Cash / Operating Revenue):
  Aaa: ≥40%       | Aa: 30–40%     | A: 20–30%      | Baa: 12.5–20%
  Ba: 5–12.5%     | B: 0–5%        | Caa: −5 to 0%  | Ca: <−5%

Long-Term Liabilities Ratio ((Debt + ANPL + Adj Net OPEB + Other LTL) / Operating Revenue):
  Aaa: ≤100%      | Aa: 100–200%   | A: 200–350%    | Baa: 350–500%
  Ba: 500–700%    | B: 700–900%    | Caa: 900–1100% | Ca: >1100%

Fixed-Costs Ratio (Adjusted Fixed Costs / Operating Revenue):
  Aaa: ≤10%       | Aa: 10–15%     | A: 15–20%      | Baa: 20–25%
  Ba: 25–35%      | B: 35–45%      | Caa: 45–55%    | Ca: >55%

K-12 SCHOOL DISTRICTS SCORECARD THRESHOLDS:
(Resident Income and Full Value per Capita: use the Cities and Counties tables above. The tables below override the Cities and Counties tables for the listed sub-factors.)

Enrollment Trend (3-year CAGR in district enrollment):
  Aaa: 2–4%       | Aa: 0–2% or >4%| A: −2 to 0%    | Baa: −5 to −2%
  Ba: −8 to −5%   | B: −11 to −8%  | Caa: −14 to −11% | Ca: <−14%
  (Note: Aaa is bounded on both ends; growth above 4% drops to Aa, reflecting concerns about capacity/cost pressure from rapid expansion.)

Available Fund Balance Ratio (GF-only Available Fund Balance / Operating Revenue):
  Aaa: ≥25%       | Aa: 17.5–25%   | A: 10–17.5%    | Baa: 5–10%
  Ba: 0–5%        | B: −5 to 0%    | Caa: −10 to −5%| Ca: <−10%

Net Cash Ratio (Net Cash / Operating Revenue):
  Aaa: ≥25%       | Aa: 17.5–25%   | A: 10–17.5%    | Baa: 5–10%
  Ba: 0–5%        | B: −5 to 0%    | Caa: −10 to −5%| Ca: <−10%

Long-Term Liabilities Ratio ((Debt + ANPL + Adj Net OPEB) / Operating Revenue — K-12 numerator EXCLUDES Other LTL):
  Aaa: ≤125%      | Aa: 125–250%   | A: 250–400%    | Baa: 400–550%
  Ba: 550–700%    | B: 700–850%    | Caa: 850–1000% | Ca: >1000%

Fixed-Costs Ratio (Adjusted Fixed Costs / Operating Revenue — K-12 thresholds, tighter than Cities):
  Aaa: ≤15%       | Aa: 15–20%     | A: 20–25%      | Baa: 25–30%
  Ba: 30–35%      | B: 35–45%      | Caa: 45–55%    | Ca: >55%

============================================================
SCORECARD-INDICATED OUTCOME — DETERMINISTIC AGGREGATION:
============================================================
Step 1 — Sub-factor numeric scores (linear interpolation within bucket):

Linear interpolation within a bucket: each bucket has a value range [low, high] and a score range. Use score endpoints Aaa [0.5–1.5], Aa [1.5–4.5], A [4.5–7.5], Baa [7.5–10.5], Ba [10.5–13.5], B [13.5–16.5], Caa [16.5–19.5], Ca [19.5–20.5]. Compute:

  score = score_at_worst_edge + (score_at_best_edge − score_at_worst_edge) × (value − value_at_worst_edge) / (value_at_best_edge − value_at_worst_edge)

For Resident Income, Full Value per Capita, Economic Growth (or Enrollment Trend for K-12), Available Fund Balance Ratio, and Liquidity Ratio (or Net Cash Ratio for K-12) — all higher-is-better — the best edge of each bucket is the Aaa-side (the upper value bound) and the worst edge is the Ca-side (the lower value bound). For Long-Term Liabilities Ratio and Fixed-Costs Ratio (higher is worse), the best edge is the Aaa-side which is the LOWER numeric value, and the worst edge is the Ca-side which is the higher numeric value. Clamp values outside the published range to the corresponding endpoint (best-side overshoot → 0.5; worst-side overshoot → 20.5).

Worked examples:
- Resident Income = 110% (higher is better) → bucket Aa [100–120%], score range [1.5, 4.5]. value_at_worst_edge = 100%, value_at_best_edge = 120%. score = 4.5 + (1.5 − 4.5) × (110 − 100) / (120 − 100) = 3.0.
- Long-Term Liabilities Ratio = 150% (higher is worse) → bucket Aa [100–200%], score range [1.5, 4.5]. value_at_worst_edge = 200%, value_at_best_edge = 100%. score = 4.5 + (1.5 − 4.5) × (150 − 200) / (100 − 200) = 3.0.

Enrollment Trend special case (K-12 only): the Aa bucket covers two disjoint value ranges (0–2% and >4%). For values in 0–2%, interpolate normally (value_at_worst_edge = 0%, value_at_best_edge = 2%). For values >4% (rapid growth that drops the rating from Aaa to Aa), assign score 4.5 (Aa worst-edge anchor) without interpolating.

Step 2 — Within each factor, average the sub-factor scores. (Sub-factor weights within a factor are equal in both methodologies, so a simple average equals a weighted average.)
  - Economy (30% factor): simple average of Resident Income, Full Value per Capita, and Economic Growth (or Enrollment Trend for K-12).
  - Financial Performance (30% factor): simple average of Available Fund Balance Ratio and Liquidity Ratio (or Net Cash Ratio for K-12).
  - Institutional Framework (10% factor): single bucket → numeric score directly (no averaging).
  - Leverage (30% factor): simple average of Long-Term Liabilities Ratio and Fixed-Costs Ratio.

Step 3 — Weighted average across factors:
  Aggregate = 0.30 × Economy_score + 0.30 × Financial_Performance_score + 0.10 × Institutional_Framework_score + 0.30 × Leverage_score

Step 4 — Map the aggregate to an alpha-numeric Scorecard-Indicated Outcome:
  ≤1.5        → Aaa
  1.5–2.5     → Aa1
  2.5–3.5     → Aa2
  3.5–4.5     → Aa3
  4.5–5.5     → A1
  5.5–6.5     → A2
  6.5–7.5     → A3
  7.5–8.5     → Baa1
  8.5–9.5     → Baa2
  9.5–10.5    → Baa3
  10.5–11.5   → Ba1
  11.5–12.5   → Ba2
  12.5–13.5   → Ba3
  13.5–14.5   → B1
  14.5–15.5   → B2
  15.5–16.5   → B3
  16.5–17.5   → Caa1
  17.5–18.5   → Caa2
  18.5–19.5   → Caa3
  19.5–20.5   → Ca
  >20.5       → C
  (Where the aggregate sits exactly on a boundary, assign it to the higher/better outcome.)

Step 5 — If ANY required sub-factor is "N/A" (data unavailable or threshold not applicable), do NOT produce a Scorecard-Indicated Outcome. Set scorecard_indicated_outcome = "N/A — insufficient public disclosure to compute" and list the missing inputs in scorecard.note.

Show your work: in scorecard.note, include the four factor scores and the aggregate weighted score so the mapping is reproducible.

The Scorecard-Indicated Outcome is a methodology-derived indicator only. It is not a credit rating, not an issuer credit opinion, and not a recommendation. MuniReports is not affiliated with Moody's Investors Service.

Include exactly this disclaimer string in scorecard.disclaimer:
"Scorecard-Indicated Outcome is the result of applying Moody's published scorecard formulas and thresholds to public source data. It is not a Moody's rating and MuniReports is not affiliated with Moody's Investors Service."

============================================================
SOURCE ATTRIBUTION:
============================================================
For data_sources field, map each major data category to the source document(s) used. Be specific. Include date and (where applicable) URL or document identifier.
Example: {"financials":"FY2024 ACFR (austintexas.gov, December 2024)","pension":"COAERS 2024 Actuarial Valuation","economy":"BEA Regional GDP 2024; BLS LAUS 2024; U.S. Census ACS 2023 5-year","scorecard_methodology":"Moody's US Cities and Counties Rating Methodology, July 24, 2024","forecast":"City of Austin FY2026-2030 Five-Year Forecast (April 2025)",...}

============================================================
FORMATTING RULES:
============================================================
- All percentages: short numbers like "31.4%". Never with parentheticals.
- All "pct" fields: like "40%". Never with explanations.
- Long context goes ONLY in description/summary/narrative fields.
- For fields where data is genuinely unavailable, use "N/A — disclosure not available". Do not use placeholder zeros for missing data.
- Write narrative text in NORMAL SENTENCE CASE. Do NOT title-case ANY field. This applies ESPECIALLY to climate_risk fields (flood_risk, wildfire_risk, hurricane_risk, heat_risk, description). Capitalize ONLY the first word of each sentence and proper nouns. Examples:
  CORRECT: "Flooding is the city's highest-priority natural hazard, with buildings averaging a 35% chance of a flood event over 30 years."
  WRONG: "Flooding Is The City's Highest-Priority Natural Hazard, With Buildings Averaging A 35% Chance Of A Flood Event Over 30 Years."
- climate_risk.overall_score: ONE phrase like "Moderate" or "Moderate-High" or "High". NOT a number/10.
- bond_market.outstanding_bonds: include ONLY bonds whose coupon, maturity, par, and (where shown) yield/price/spread you can trace to an EMMA filing or Bond Buyer report in your search results. Omit any bond you cannot fully source. Do NOT estimate prices or spreads.
- bond_market.avg_spread: weighted average of per-bond spreads from the sourced bonds, formatted "XX bps". If no bonds are fully sourced, set to "N/A".

============================================================
METHODOLOGY FOOTER:
============================================================
Return the following exact string in the methodology_note field (rendered immediately above the Sources section):
"Methodology Note: Quantitative ratios shown in the Credit Scorecard section are computed using the framework published in Moody's Investors Service, US Cities and Counties Rating Methodology (July 24, 2024) [for cities and counties] or US K-12 Public School Districts Rating Methodology (July 24, 2024) [for school districts]. Threshold ranges and scoring buckets follow the published scorecard. MuniReports is not affiliated with Moody's. The 'Scorecard-Indicated Outcome' shown is the result of applying the published methodology to public source data and is not a Moody's rating."

Return this JSON structure:
{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":85,
"scorecard":{"applicable":true,"methodology":"US Cities and Counties","scorecard_indicated_outcome":"A2","disclaimer":"Scorecard-Indicated Outcome is the result of applying Moody's published scorecard formulas and thresholds to public source data. It is not a Moody's rating and MuniReports is not affiliated with Moody's Investors Service.","note":"","factors":{"economy":{"weight":"30%","sub_factors":{"resident_income":{"value":"","bucket":"","interpretation":"","inputs":{"issuer_mhi":0,"us_mhi":0,"rpp":0,"adjusted_mhi":0}},"full_value_per_capita":{"value":"","bucket":"","interpretation":"","inputs":{"full_value":0,"population":0}},"economic_growth":{"value":"","bucket":"","interpretation":"","inputs":{"msa_5yr_cagr":"","us_5yr_cagr":""}}}},"financial_performance":{"weight":"30%","sub_factors":{"available_fund_balance_ratio":{"value":"","bucket":"","interpretation":"","inputs":{"available_fund_balance":0,"net_current_assets_outside_gf":0,"operating_revenue":0}},"liquidity_ratio":{"value":"","bucket":"","interpretation":"","inputs":{"unrestricted_cash":0,"operating_revenue":0}}}},"institutional_framework":{"weight":"10%","value":"","bucket":"","interpretation":""},"leverage":{"weight":"30%","sub_factors":{"long_term_liabilities_ratio":{"value":"","bucket":"","interpretation":"","inputs":{"debt":0,"anpl":0,"adjusted_net_opeb":0,"other_ltl":0,"operating_revenue":0}},"fixed_costs_ratio":{"value":"","bucket":"","interpretation":"","inputs":{"implied_debt_service":0,"pension_tread_water":0,"opeb_contributions":0,"other_ltl_carrying_costs":0,"operating_revenue":0}}}}}},
"executive_summary":"2-3 paragraphs with specific data, every number traceable to a Source",
"economy":{"description":"paragraph","unemployment_rate":"X.X%","median_household_income":0,"poverty_rate":"X.X%","top_employers":["","","","",""],"economic_indicators":[{"name":"GDP Growth","value":"X.X%","trend":"up"},{"name":"Employment","value":"XX,XXX","trend":"up"},{"name":"Population","value":"XX,XXX","trend":"up"},{"name":"Permits","value":"X,XXX","trend":"up"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX.X%","available_reserves":0,"available_reserves_ratio":"XX.X%","operating_margin":"X.X%","debt_outstanding":0,"debt_per_capita":"$X,XXX","days_cash_on_hand":0,"pension_funded_ratio":"XX%"},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":"XX%"},{"category":"Sales Tax","pct":"XX%"},{"category":"Charges","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"expenditure_composition":[{"category":"Public Safety","pct":"XX%"},{"category":"General Gov","pct":"XX%"},{"category":"Public Works","pct":"XX%"},{"category":"Debt Service","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"strengths":["specific strength 1","specific strength 2","specific strength 3"],
"risks":[{"title":"","severity":"high","description":"specific risk with numbers"},{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"capital_plan_summary":"1-2 paragraph CIP narrative — total size, themes, funding mix",
"pension":{"system_name":"","funded_ratio":"XX.X%","anpl":0,"contribution_to_adc":"XXX%"},
"bond_market":{"outstanding_bonds":[{"description":"GO Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps","source":"EMMA filing date and CUSIP"}],"total_outstanding_par":0,"avg_coupon":"X.XX%","avg_yield":"X.XX%","avg_spread":"XX bps","market_commentary":"1-2 sentences in normal sentence case"},
"tax_burden":{"property_tax_rate":"","property_tax_rate_vs_state":"","total_tax_burden_per_capita":"","sales_tax_rate":"","homestead_exemption":""},
"housing":{"median_home_value":0,"median_home_value_to_income":"","assessed_value_growth_5yr":"","homeownership_rate":""},
"climate_risk":{"flood_risk":"sentence in normal case","wildfire_risk":"sentence in normal case","hurricane_risk":"sentence in normal case","heat_risk":"sentence in normal case","overall_score":"Moderate","description":"1-2 sentences in normal case"},
"forecast":{"source":"Verbatim title and publication date of the issuer's own multi-year forecast document, OR 'N/A — issuer does not publish a multi-year forecast'","description":"verbatim summary of the issuer's own forecast narrative, no synthetic baselines","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}]},
"forward_outlook":"1-2 paragraphs on the issuer's own articulated outlook drivers. Do not introduce numbers not present in the financial trend or forecast sections.",
"methodology_note":"Methodology Note: Quantitative ratios shown in the Credit Scorecard section are computed using the framework published in Moody's Investors Service, US Cities and Counties Rating Methodology (July 24, 2024) [for cities and counties] or US K-12 Public School Districts Rating Methodology (July 24, 2024) [for school districts]. Threshold ranges and scoring buckets follow the published scorecard. MuniReports is not affiliated with Moody's. The 'Scorecard-Indicated Outcome' shown is the result of applying the published methodology to public source data and is not a Moody's rating.",
"data_sources":{"financials":"specific document name and date","pension":"specific document name and date","economy":"specific source(s) including BEA RPP and Regional GDP","bond_market":"EMMA filings cited (CUSIP + filing date)","forecast":"issuer's own multi-year forecast doc name and date, or N/A","scorecard_methodology":"Moody's US Cities and Counties Rating Methodology, July 24, 2024","climate":"sources","housing":"sources","tax":"sources"},
"sources":["ACFR (full title and date)","Budget (full title and date)","EMMA (specific filings with CUSIP and date)","Census ACS (year)","BEA Regional GDP (year)","BEA Regional Price Parities (year)","BLS LAUS (year)","Pension valuation (system name and date)","Moody's US Cities and Counties Rating Methodology (July 24, 2024)","Other source"]}

Make the JSON complete and valid. Close all braces and brackets.`;

    const apiResponse = await callClaude(apiKey, prompt);

    if (apiResponse?.error) {
      console.error("API error:", JSON.stringify(apiResponse.error));
      return NextResponse.json({ error: apiResponse.error.message || "Generation failed" }, { status: 500 });
    }

    const report = extractJSON(apiResponse);
    if (!report) {
      // Diagnostics to distinguish truncation from format issues.
      // One JSON line per failure for easy grepping in Vercel logs.
      let rawText = "";
      if (apiResponse?.content) {
        for (const block of apiResponse.content) {
          if (block.type === "text") rawText += block.text;
        }
      }
      console.error("[generate-report] JSON parse failure " + JSON.stringify({
        issuer: cacheKey,
        stop_reason: apiResponse?.stop_reason ?? null,
        usage: apiResponse?.usage ?? null,
        text_length: rawText.length,
        first_brace_at: rawText.indexOf("{"),
        last_brace_at: rawText.lastIndexOf("}"),
        text_head: rawText.slice(0, 500),
        text_tail: rawText.slice(-500),
      }));
      return NextResponse.json({ error: "Failed to parse report. Please try again." }, { status: 500 });
    }

    // De-title-case climate_risk narrative fields (model has a strong title-case prior here)
    if (report.climate_risk) {
      const fields = ["flood_risk", "wildfire_risk", "hurricane_risk", "heat_risk", "description"];
      for (const f of fields) {
        const v = report.climate_risk[f];
        if (typeof v !== "string" || !v) continue;
        const words = v.split(/\s+/);
        const titleCased = words.filter((w: string) => /^[A-Z][a-z]/.test(w)).length / words.length > 0.5;
        if (titleCased) {
          report.climate_risk[f] = v
            .toLowerCase()
            .replace(/(^|[.!?]\s+)([a-z])/g, (_: string, p: string, c: string) => p + c.toUpperCase());
        }
      }
    }

    const generatedAt = new Date().toISOString();
    if (cacheKey && cacheKey !== "|") {
      try {
        await supabase.from("cached_reports").upsert({
          issuer_key: cacheKey,
          issuer_name: report.issuer_name || issuerName,
          state: report.state || issuerState,
          report_data: report,
          generated_at: generatedAt,
          refresh_count: forceRefresh ? 1 : 0,
        }, { onConflict: "issuer_key" });
        console.log(`Cache saved: ${cacheKey}`);
      } catch (saveErr) {
        console.error("Cache save failed (non-fatal):", saveErr);
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    let savedId = null;
    if (user) {
      try {
        const { data: saveData } = await supabase.from("reports").insert({
          user_id: user.id,
          issuer_name: report.issuer_name || issuerName,
          state: report.state || issuerState,
          issuer_type: report.type,
          rating: report.rating,
          sentiment: report.sentiment,
          sentiment_score: report.sentiment_score,
          report_data: report,
        }).select("id").single();
        if (saveData) savedId = saveData.id;
      } catch (saveErr) {
        console.error("User library save failed:", saveErr);
      }
    }

    return NextResponse.json({
      report,
      cached: false,
      generatedAt,
      savedId,
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
