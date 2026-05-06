import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 120;

// Sleep helper
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Calls Claude with automatic retry on rate limits and transient errors
async function callClaude(apiKey: string, prompt: string, useSearch: boolean = true) {
  const body: any = {
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const maxAttempts = 4;
  // Wait times in ms before each retry: 2s, 5s, 12s
  const backoffs = [2000, 5000, 12000];

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

      // If we got a real response (success or content error), return it
      if (response.ok && !data.error) {
        return data;
      }

      // Check error type for retry decision
      const errType = data?.error?.type || "";
      const isRetryable =
        response.status === 429 ||           // rate limit
        response.status === 529 ||           // overloaded
        response.status >= 500 ||            // server errors
        errType === "rate_limit_error" ||
        errType === "overloaded_error" ||
        errType === "api_error";

      lastError = data;

      // If not retryable, give up immediately
      if (!isRetryable) {
        console.error(`Non-retryable error (status ${response.status}):`, JSON.stringify(data.error));
        return data;
      }

      // If this was the last attempt, return what we have
      if (attempt === maxAttempts - 1) {
        console.error(`Exhausted ${maxAttempts} attempts. Last error:`, JSON.stringify(data.error));
        return data;
      }

      // Otherwise wait and retry
      const wait = backoffs[attempt];
      console.warn(`Retryable error on attempt ${attempt + 1}/${maxAttempts} (${errType || response.status}). Waiting ${wait}ms before retry.`);
      await sleep(wait);
    } catch (err) {
      // Network errors etc — retry these too
      lastError = err;
      if (attempt === maxAttempts - 1) {
        console.error("Network error, exhausted retries:", err);
        return { error: { type: "network_error", message: String(err) } };
      }
      const wait = backoffs[attempt];
      console.warn(`Network error on attempt ${attempt + 1}/${maxAttempts}. Waiting ${wait}ms.`);
      await sleep(wait);
    }
  }

  return lastError || { error: { type: "unknown", message: "All retry attempts failed" } };
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
    console.error("Parse error:", e);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY || "";

    // CALL 1: Core financial data
    const call1 = await callClaude(apiKey, `Search the web for financial data for "${issuerName}" in ${issuerState || "US"}. Find latest ACFR, budget, and ratings. Return ONLY valid JSON.

CRITICAL RULES:
- All ratio/percentage fields must be SHORT numbers only. Example: "31.4%" NOT "31.4% of General Fund revenues (FY2021 reported)"
- All pct fields must be just "XX%" like "40%" NOT "~40% (General Fund: $31.3M of $78.1M)"
- Keep values concise. No parenthetical explanations in data fields.
- Explanatory context goes ONLY in executive_summary, economy.description, capital_plan_summary, and forward_outlook fields.

{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"","sentiment":"Positive","sentiment_score":85,
"executive_summary":"2-3 detailed paragraphs citing specific data",
"economy":{"description":"paragraph","unemployment_rate":"X.X%","median_household_income":0,"poverty_rate":"X.X%","msa_gdp_growth":"X.X%","net_migration":"","top_employers":["","","","",""],"economic_indicators":[{"name":"GDP Growth","value":"X.X%","trend":"up"},{"name":"Employment","value":"XX,XXX","trend":"up"},{"name":"Population","value":"XX,XXX","trend":"up"},{"name":"Permits","value":"X,XXX","trend":"up"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX.X%","available_fund_balance_ratio":"XX.X%","operating_margin":"X.X%","liquidity_ratio":"XX.X%","debt_outstanding":0,"debt_to_revenue":"X.XX","debt_per_capita":"$X,XXX","full_value_per_capita":"$XXX,XXX","days_cash_on_hand":0,"tax_collection_rate":"XX.X%","top_10_taxpayers_pct":"XX.X%"},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":"XX%"},{"category":"Sales Tax","pct":"XX%"},{"category":"Charges/Utility","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"expenditure_composition":[{"category":"Public Safety","pct":"XX%"},{"category":"General Gov","pct":"XX%"},{"category":"Public Works","pct":"XX%"},{"category":"Debt Service","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"risks":[{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"strengths":["","","",""],
"capital_plan_summary":"paragraph",
"forward_outlook":"paragraph",
"sources":["","","",""]}
Fill ALL values with real data. Return complete valid JSON.`);

    const coreReport = extractJSON(call1);
    if (!coreReport) {
      console.error("Call 1 failed. Error:", call1?.error ? JSON.stringify(call1.error) : "No parseable JSON");
      return NextResponse.json({ error: "Failed to generate report core data. Please try again." }, { status: 500 });
    }

    // Wait between calls to be friendly to rate limits
    await sleep(4000);

    // CALL 2: Differentiator data
    const call2 = await callClaude(apiKey, `Search the web for "${issuerName}" in ${issuerState || "US"}. Find pension data, outstanding bonds on EMMA, property tax rates, housing data, climate risk, and peer comparables. Return ONLY valid JSON.

CRITICAL RULES:
- All ratio/percentage fields must be SHORT numbers only like "73.2%" NOT "73.2% (per latest valuation report)"
- All pct fields must be just "XX%" with no parentheticals
- Keep values concise. No explanations inside data fields.

{"pension":{"system_name":"","funded_ratio":"XX.X%","anpl":0,"anpl_to_revenue":"X.XX","contribution_to_adc":"XXX%","discount_rate":"X.X%"},
"bond_market":{"outstanding_bonds":[{"cusip":"","description":"GO Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"},{"cusip":"","description":"Revenue Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"}],"total_outstanding_par":0,"avg_coupon":"X.XX%","avg_yield":"X.XX%","avg_spread":"XX bps","market_commentary":"1-2 sentences"},
"tax_burden":{"property_tax_rate":"","property_tax_rate_vs_state":"","effective_tax_rate":"","total_tax_burden_per_capita":"","sales_tax_rate":"","homestead_exemption":""},
"housing":{"median_home_value":0,"median_home_value_to_income":"","avg_assessed_value":0,"assessed_value_growth_5yr":"","homeownership_rate":""},
"climate_risk":{"flood_risk":"","wildfire_risk":"","hurricane_risk":"","heat_risk":"","overall_score":"","description":""},
"forecast":{"description":"paragraph about projections","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0}]},
"peer_comparison":[{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""}],
"scorecard":{"economy":{"score":"","factors":[{"name":"Tax Base","value":"","score":""},{"name":"Per Capita Income","value":"","score":""}]},"finances":{"score":"","factors":[{"name":"Fund Balance","value":"","score":""},{"name":"Revenue Trend","value":"","score":""}]},"management":{"score":"","factors":[{"name":"Governance","value":"","score":""},{"name":"Budget History","value":"","score":""}]},"debt_profile":{"score":"","factors":[{"name":"Debt/Revenue","value":"","score":""},{"name":"Pension","value":"","score":""}]}},
"ai_confidence":{"overall":"high","financials":"high","economy":"high","description":"sentence about data sources"}}
IMPORTANT: Scenario fy26-fy30 values are NET SURPLUS or DEFICIT in millions (e.g. 7 means +$7M surplus, -3 means $3M deficit). NOT total revenue. Fill with real data. Return complete valid JSON.`);

    const diffData = extractJSON(call2);
    let call2Failed = false;
    if (!diffData) {
      call2Failed = true;
      console.error("Call 2 failed after retries. Error:", call2?.error ? JSON.stringify(call2.error) : "No parseable JSON");
    }

    // Merge both results
    const report: any = { ...coreReport };
    if (diffData) {
      if (diffData.pension) report.pension = diffData.pension;
      if (diffData.bond_market) report.bond_market = diffData.bond_market;
      if (diffData.tax_burden) report.tax_burden = diffData.tax_burden;
      if (diffData.housing) report.housing = diffData.housing;
      if (diffData.climate_risk) report.climate_risk = diffData.climate_risk;
      if (diffData.forecast) report.forecast = diffData.forecast;
      if (diffData.peer_comparison) report.peer_comparison = diffData.peer_comparison;
      if (diffData.scorecard) report.scorecard = diffData.scorecard;
      if (diffData.ai_confidence) report.ai_confidence = diffData.ai_confidence;
    }

    // Flag partial reports so the UI can show a notice
    report._partial = call2Failed;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let savedId = null;
    if (user) {
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
    }

    return NextResponse.json({ report, savedId, partial: call2Failed });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
