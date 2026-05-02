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
        max_tokens: 4096,
        tools: [{"type": "web_search_20250305", "name": "web_search"}],
        messages: [{
          role: "user",
          content: `Search the web for financial data for "${issuerName}" in ${issuerState || "US"}. Find latest ACFR, budget, ratings, pension reports, and bond data on EMMA. Return ONLY valid JSON, no markdown.

{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":82,
"executive_summary":"2-3 paragraphs",
"economy":{"description":"paragraph","unemployment_rate":"","median_household_income":0,"poverty_rate":"","msa_gdp_growth":"","resident_income_ratio":"","net_migration":"","top_employers":["","","","",""],"economic_indicators":[{"name":"MSA GDP Growth","value":"","trend":"up"},{"name":"Employment Growth","value":"","trend":"up"},{"name":"Population Growth","value":"","trend":"up"},{"name":"Building Permits","value":"","trend":"up"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"","available_fund_balance_ratio":"","operating_margin":"","liquidity_ratio":"","debt_outstanding":0,"debt_to_revenue":"","debt_per_capita":"","full_value_per_capita":"","total_assessed_value":0,"days_cash_on_hand":0,"tax_collection_rate":"","top_10_taxpayers_pct":""},
"pension":{"funded_ratio":"","adjusted_net_pension_liability":0,"anpl_to_revenue":"","employer_contribution":0,"contribution_to_adc":"","system_name":""},
"bond_market":{"outstanding_bonds":[{"description":"","par_amount":0,"coupon":"","maturity":"","yield_to_maturity":"","price":"","spread_to_aaa":""}],"total_outstanding_par":0,"avg_coupon":"","avg_yield":"","avg_spread":"","market_commentary":""},
"tax_burden":{"property_tax_rate":"","property_tax_rate_vs_state":"","effective_tax_rate":"","total_tax_burden_per_capita":"","sales_tax_rate":"","homestead_exemption":""},
"housing":{"median_home_value":0,"median_home_value_to_income":"","avg_assessed_value":0,"assessed_value_growth_5yr":"","homeownership_rate":""},
"climate_risk":{"flood_risk":"","wildfire_risk":"","hurricane_risk":"","heat_risk":"","overall_score":"","description":""},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":""},{"category":"Sales Tax","pct":""},{"category":"Charges","pct":""},{"category":"Other","pct":""}],
"expenditure_composition":[{"category":"Public Safety","pct":""},{"category":"General Gov","pct":""},{"category":"Public Works","pct":""},{"category":"Debt Service","pct":""},{"category":"Other","pct":""}],
"forecast":{"description":"","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0}],"scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0}]},
"peer_comparison":[{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""}],
"risks":[{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"strengths":["","",""],
"capital_plan_summary":"",
"forward_outlook":"",
"ai_confidence":{"overall":"high","financials":"high","economy":"high","description":""},
"sources":["","",""]}

IMPORTANT: Fill ALL fields with real data. Include at least 1-2 outstanding bonds with real CUSIP/series info from EMMA. Return COMPLETE valid JSON.`
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
