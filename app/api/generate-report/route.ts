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
        max_tokens: 2500,
        tools: [{"type": "web_search_20250305", "name": "web_search"}],
        messages: [{
          role: "user",
          content: `Search the web for the most recent financial data for "${issuerName}" in ${issuerState || "US"}. Find their latest ACFR, adopted budget, and credit ratings. Then return ONLY a valid JSON credit report, no markdown:
{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":82,
"executive_summary":"2 paragraphs citing specific recent fiscal year data you found",
"economy":{"description":"1 paragraph","unemployment_rate":"X.X%","median_household_income":0,"poverty_rate":"X.X%","top_employers":["","","","",""],"economic_indicators":[{"name":"GDP Growth","value":"X.X%","trend":"up"},{"name":"Employment Growth","value":"X.X%","trend":"up"},{"name":"Population Growth","value":"X.X%","trend":"up"},{"name":"Housing Starts","value":"X,XXX","trend":"flat"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX%","operating_margin":"X.X%","debt_outstanding":0,"debt_to_revenue":"X.XX","debt_per_capita":"$X,XXX","pension_funded_ratio":"XX%","days_cash_on_hand":0},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":"XX%"},{"category":"Sales Tax","pct":"XX%"},{"category":"Charges","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"expenditure_composition":[{"category":"Public Safety","pct":"XX%"},{"category":"General Gov","pct":"XX%"},{"category":"Public Works","pct":"XX%"},{"category":"Debt Service","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"forecast":{"description":"1 paragraph","scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0}],"revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}]},
"risks":[{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"strengths":["","",""],
"capital_plan_summary":"1 paragraph",
"forward_outlook":"1 paragraph",
"sources":["","",""]}
Fill ALL values with real data from your web search. Use the most recent fiscal year available.`
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
      if (match) report = JSON.parse(match[0]);
    } catch (e) {
      console.error("Parse error:", e, "Text:", text.substring(0, 300));
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
