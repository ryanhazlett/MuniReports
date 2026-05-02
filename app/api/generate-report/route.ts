import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        tools: [{"type": "web_search_20250305", "name": "web_search"}],
        messages: [{
          role: "user",
          content: `Search the web for comprehensive financial data for "${issuerName}" in ${issuerState || "US"}. Find their latest ACFR, budget, bond ratings, pension reports, and economic data. Then return ONLY valid JSON (no markdown, no backticks). The JSON must be complete.

Structure:
{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":82,
"executive_summary":"3 detailed paragraphs citing specific fiscal year data",
"economy":{"description":"detailed paragraph","unemployment_rate":"X.X%","median_household_income":0,"poverty_rate":"X.X%","msa_gdp_growth":"X.X%","resident_income_ratio":"XXX%","net_migration":"positive/negative with number","top_employers":["","","","",""],"economic_indicators":[{"name":"MSA GDP Growth","value":"X.X%","trend":"up"},{"name":"Employment Growth","value":"X.X%","trend":"up"},{"name":"Population Growth","value":"X.X%","trend":"up"},{"name":"Building Permits","value":"X,XXX","trend":"up"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX.X%","available_fund_balance_ratio":"XX.X%","operating_margin":"X.X%","liquidity_ratio":"XX.X%","debt_outstanding":0,"debt_to_revenue":"X.XX","debt_per_capita":"$X,XXX","full_value_per_capita":"$XXX,XXX","total_assessed_value":0,"days_cash_on_hand":0,"tax_collection_rate":"XX.X%","top_10_taxpayers_pct":"XX.X%"},
"pension":{"funded_ratio":"XX.X%","adjusted_net_pension_liability":0,"anpl_to_revenue":"XX.X%","employer_contribution":0,"contribution_to_adc":"XXX%","system_name":"pension system name"},
"tax_burden":{"property_tax_rate":"$X.XX per $100","property_tax_rate_vs_state":"below/above average","effective_tax_rate":"X.XX%","total_tax_burden_per_capita":"$X,XXX","sales_tax_rate":"X.XX%","homestead_exemption":"$XX,XXX or none"},
"housing":{"median_home_value":0,"median_home_value_to_income":"X.X","avg_assessed_value":0,"assessed_value_growth_5yr":"XX.X%","homeownership_rate":"XX.X%"},
"bond_market":{"outstanding_bonds":[{"cusip":"","description":"GO Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"},{"cusip":"","description":"Revenue Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"}],"total_outstanding_par":0,"avg_coupon":"X.XX%","avg_yield":"X.XX%","avg_spread":"XX bps","market_commentary":"1-2 sentences about current trading conditions and investor demand"},
"climate_risk":{"flood_risk":"low/moderate/high","wildfire_risk":"low/moderate/high","hurricane_risk":"low/moderate/high","heat_risk":"low/moderate/high","overall_score":"X/10","description":"1-2 sentences about natural hazard exposure"},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":"XX%"},{"category":"Sales Tax","pct":"XX%"},{"category":"Charges","pct":"XX%"},{"category":"Intergovernmental","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"expenditure_composition":[{"category":"Public Safety","pct":"XX%"},{"category":"General Gov","pct":"XX%"},{"category":"Public Works","pct":"XX%"},{"category":"Debt Service","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"forecast":{"description":"paragraph","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0}],"scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0}]},
"peer_comparison":[{"name":"","population":0,"rating":"","fund_balance_ratio":"XX%","debt_per_capita":"$X,XXX","operating_margin":"X%"},{"name":"","population":0,"rating":"","fund_balance_ratio":"XX%","debt_per_capita":"$X,XXX","operating_margin":"X%"},{"name":"","population":0,"rating":"","fund_balance_ratio":"XX%","debt_per_capita":"$X,XXX","operating_margin":"X%"}],
"risks":[{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"strengths":["","","",""],
"capital_plan_summary":"paragraph",
"forward_outlook":"paragraph",
"ai_confidence":{"overall":"high/medium/low","financials":"high/medium/low","economy":"high/medium/low","description":"1 sentence about data freshness"},
"sources":["","","",""]}

Fill ALL values with real data from web search. Use most recent fiscal year. Scenario values are net surplus/deficit in $M. CRITICAL: Return complete, valid JSON.`
        }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("API error:", JSON.stringify(data.error));
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    let text = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text;
      }
    }

    let report: any = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        let jsonStr = match[0];
        let ob = (jsonStr.match(/\{/g)||[]).length;
        let cb = (jsonStr.match(/\}/g)||[]).length;
        let oq = (jsonStr.match(/\[/g)||[]).length;
        let cq = (jsonStr.match(/\]/g)||[]).length;
        while (cq < oq) { jsonStr += "]"; cq++; }
        while (cb < ob) { jsonStr += "}"; cb++; }
        jsonStr = jsonStr.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
        report = JSON.parse(jsonStr);
      }
    } catch (e) {
      console.error("Parse error:", e, "End:", text.substring(Math.max(0,text.length-300)));
    }

    if (!report) {
      return NextResponse.json({ error: "Failed to parse report" }, { status: 500 });
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
