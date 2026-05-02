import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 120;

async function callClaude(apiKey: string, prompt: string, useSearch: boolean = true) {
  const body: any = {
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  };
  if (useSearch) {
    body.tools = [{"type": "web_search_20250305", "name": "web_search"}];
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

function extractJSON(data: any): any {
  let text = "";
  if (data.content) {
    for (const block of data.content) {
      if (block.type === "text") text += block.text;
    }
  }
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      let j = match[0];
      let ob = (j.match(/\{/g)||[]).length;
      let cb = (j.match(/\}/g)||[]).length;
      let oq = (j.match(/\[/g)||[]).length;
      let cq = (j.match(/\]/g)||[]).length;
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
      if (call1.error) {
        console.error("Call 1 API error:", JSON.stringify(call1.error));
        return NextResponse.json({ error: call1.error.message }, { status: 500 });
      }
      return NextResponse.json({ error: "Failed to parse core report" }, { status: 500 });
    }

    // Wait 2 seconds to avoid rate limit
    await new Promise(r => setTimeout(r, 2000));

    // CALL 2: Differentiators (pension, bonds, tax, housing, climate, forecast, peers)
    const call2 = await callClaude(apiKey, `Search the web for additional data for "${issuerName}" in ${issuerState || "US"}. Find pension reports, bond info on EMMA, tax rates, housing data, and climate risk. Return ONLY valid JSON:
{"pension":{"funded_ratio":"","adjusted_net_pension_liability":0,"anpl_to_revenue":"","employer_contribution":0,"contribution_to_adc":"","system_name":""},
"bond_market":{"outstanding_bonds":[{"description":"GO Bonds Series XXXX","par_amount":0,"coupon":"","maturity":"","yield_to_maturity":"","price":"","spread_to_aaa":""},{"description":"Rev Bonds Series XXXX","par_amount":0,"coupon":"","maturity":"","yield_to_maturity":"","price":"","spread_to_aaa":""}],"total_outstanding_par":0,"avg_coupon":"","avg_yield":"","avg_spread":"","market_commentary":"1-2 sentences"},
"tax_burden":{"property_tax_rate":"","property_tax_rate_vs_state":"","effective_tax_rate":"","total_tax_burden_per_capita":"","sales_tax_rate":"","homestead_exemption":""},
"housing":{"median_home_value":0,"median_home_value_to_income":"","avg_assessed_value":0,"assessed_value_growth_5yr":"","homeownership_rate":""},
"climate_risk":{"flood_risk":"","wildfire_risk":"","hurricane_risk":"","heat_risk":"","overall_score":"","description":""},
"forecast":{"description":"paragraph about projections","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0}]},
"peer_comparison":[{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""}],
"scorecard":{"economy":{"score":"","factors":[{"name":"Tax Base","value":"","score":""},{"name":"Per Capita Income","value":"","score":""}]},"finances":{"score":"","factors":[{"name":"Fund Balance","value":"","score":""},{"name":"Revenue Trend","value":"","score":""}]},"management":{"score":"","factors":[{"name":"Governance","value":"","score":""},{"name":"Budget History","value":"","score":""}]},"debt_profile":{"score":"","factors":[{"name":"Debt/Revenue","value":"","score":""},{"name":"Pension","value":"","score":""}]}},
"ai_confidence":{"overall":"high","financials":"high","economy":"high","description":"sentence about data sources"}}
IMPORTANT: Scenario fy26-fy30 values should be NET SURPLUS or DEFICIT in millions (e.g. 7 means +$7M surplus, -3 means $3M deficit). NOT total revenue. Fill with real data. Return complete valid JSON.`);

    const diffData = extractJSON(call2);
    if (!diffData) {
      console.error("Call 2 failed or returned no data. Error:", call2.error ? JSON.stringify(call2.error) : "No parseable JSON");
    }

    // Merge both results
    const report = { ...coreReport };
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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let savedId = null;
    if (user) {
      const { data: saveData } = await supabase.from("reports").insert({
        user_id: user.id, issuer_name: report.issuer_name || issuerName,
        state: report.state || issuerState, issuer_type: report.type,
        rating: report.rating, sentiment: report.sentiment,
        sentiment_score: report.sentiment_score, report_data: report,
      }).select("id").single();
      if (saveData) savedId = saveData.id;
    }
    return NextResponse.json({ report, savedId });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
