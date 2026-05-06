import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 300;

const CACHE_TTL_DAYS = 7;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function normalizeKey(name: string, state: string): string {
  return `${(name || "").trim().toLowerCase()}|${(state || "").trim().toLowerCase()}`;
}

async function callClaude(apiKey: string, prompt: string) {
  const body: any = {
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    temperature: 0.1,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  };

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

    const prompt = `Search the web for "${issuerName}" in ${issuerState || "US"}. Find their most recent published Annual Comprehensive Financial Report (ACFR), adopted budget, capital improvement plan (CIP), EMMA bond filings, pension actuarial valuations, ratings agency reports, and economic data from BLS/Census/state sources. Then return ONLY valid JSON. NO markdown. NO backticks. NO explanation outside the JSON.

============================================================
DEFINITIONS — USE THESE EXACTLY (do not improvise):
============================================================
- total_revenue: GENERAL FUND actual total revenue from the most recent FISCAL YEAR ACTUAL in the ACFR. Not budget. Not all-funds. Not enterprise.
- total_expenditures: GENERAL FUND actual total expenditures from the most recent FISCAL YEAR ACTUAL in the ACFR.
- fund_balance: UNASSIGNED general fund balance per the most recent ACFR balance sheet. NOT total fund balance, NOT committed+assigned, NOT all-funds combined.
- fund_balance_ratio: (unassigned general fund balance) / (general fund total expenditures) × 100, expressed as "XX.X%"
- operating_margin: (general fund revenue - general fund expenditures) / general fund revenue × 100, expressed as "X.X%"
- debt_outstanding: TAX-SUPPORTED general obligation (GO) debt only, EXCLUDING enterprise/utility revenue debt, EXCLUDING component units. From the latest ACFR debt schedule.
- debt_to_revenue: debt_outstanding / general fund revenue, expressed as "X.XX"
- debt_per_capita: debt_outstanding / population, expressed as "$X,XXX"
- pension_funded_ratio: actuarial funded ratio (NOT market value) from most recent pension valuation, expressed as "XX.X%"
- days_cash_on_hand: (general fund cash & equivalents × 365) / general fund expenditures, integer
- revenue_trend / expenditure_trend: GENERAL FUND ACTUAL totals from each year's ACFR. Five years FY2021-FY2025 if available.
- revenue_composition / expenditure_composition: percentages of GENERAL FUND only.

============================================================
FORMATTING RULES:
============================================================
- All percentages: short numbers like "31.4%". Never with parentheticals.
- All "pct" fields: like "40%". Never with explanations.
- Long context goes ONLY in description/summary/narrative fields.
- Fill EVERY field. Use "—" or 0 for unknown values, but try web search first.
- Write narrative text in NORMAL SENTENCE CASE. Do NOT title-case. Correct: "wildland-urban interface areas in western Austin." WRONG: "Wildland-Urban Interface Areas In Western Austin."
- climate_risk.overall_score: ONE phrase like "Moderate" or "Moderate-High" or "High". NOT a number/10.
- bond_market.outstanding_bonds: every bond MUST have a "price" (estimate from YTM/coupon if needed, format "$XXX.XX") and "spread_to_aaa" in basis points (format "XX bps"). Never blank.
- bond_market.avg_spread: average of per-bond spreads, format "XX bps". Never blank.

Return this JSON structure:
{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":85,
"executive_summary":"2-3 paragraphs with specific data",
"economy":{"description":"paragraph","unemployment_rate":"X.X%","median_household_income":0,"poverty_rate":"X.X%","top_employers":["","","","",""],"economic_indicators":[{"name":"GDP Growth","value":"X.X%","trend":"up"},{"name":"Employment","value":"XX,XXX","trend":"up"},{"name":"Population","value":"XX,XXX","trend":"up"},{"name":"Permits","value":"X,XXX","trend":"up"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX.X%","operating_margin":"X.X%","debt_outstanding":0,"debt_to_revenue":"X.XX","debt_per_capita":"$X,XXX","days_cash_on_hand":0,"pension_funded_ratio":"XX%"},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":"XX%"},{"category":"Sales Tax","pct":"XX%"},{"category":"Charges","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"expenditure_composition":[{"category":"Public Safety","pct":"XX%"},{"category":"General Gov","pct":"XX%"},{"category":"Public Works","pct":"XX%"},{"category":"Debt Service","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"strengths":["specific strength 1","specific strength 2","specific strength 3"],
"risks":[{"title":"","severity":"high","description":"specific risk with numbers"},{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"capital_plan_summary":"1-2 paragraph CIP narrative — total size, themes, funding mix",
"pension":{"system_name":"","funded_ratio":"XX.X%","anpl":0,"contribution_to_adc":"XXX%"},
"bond_market":{"outstanding_bonds":[{"description":"GO Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"},{"description":"Revenue Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"}],"total_outstanding_par":0,"avg_coupon":"X.XX%","avg_yield":"X.XX%","avg_spread":"XX bps","market_commentary":"1-2 sentences in normal sentence case"},
"tax_burden":{"property_tax_rate":"","property_tax_rate_vs_state":"","total_tax_burden_per_capita":"","sales_tax_rate":"","homestead_exemption":""},
"housing":{"median_home_value":0,"median_home_value_to_income":"","assessed_value_growth_5yr":"","homeownership_rate":""},
"climate_risk":{"flood_risk":"sentence in normal case","wildfire_risk":"sentence in normal case","hurricane_risk":"sentence in normal case","heat_risk":"sentence in normal case","overall_score":"Moderate","description":"1-2 sentences in normal case"},
"forecast":{"description":"1 paragraph on near-term outlook","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0}]},
"forward_outlook":"1-2 paragraphs on 5-year outlook and key drivers",
"peer_comparison":[{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""}],
"sources":["ACFR","Budget","EMMA","Census","other source"]}

CRITICAL: scenarios fy26-fy30 are NET SURPLUS or DEFICIT in millions (e.g. 7 = +$7M surplus, -3 = -$3M deficit). NOT total revenue.
Make the JSON complete and valid. Close all braces and brackets.`;

    const apiResponse = await callClaude(apiKey, prompt);

    if (apiResponse?.error) {
      console.error("API error:", JSON.stringify(apiResponse.error));
      return NextResponse.json({ error: apiResponse.error.message || "Generation failed" }, { status: 500 });
    }

    const report = extractJSON(apiResponse);
    if (!report) {
      return NextResponse.json({ error: "Failed to parse report. Please try again." }, { status: 500 });
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
