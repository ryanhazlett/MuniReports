import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: `Municipal credit analyst: generate a credit report JSON for "${issuerName}" in ${issuerState || "US"}.

Return ONLY this JSON (no markdown):
{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":82,"executive_summary":"2-3 paragraphs","scorecard":{"economy":{"score":"Aa1","factors":[{"name":"Tax Base","value":"$XXB","score":"Aa1"},{"name":"Per Capita Income","value":"$XX,XXX","score":"Aa2"}]},"finances":{"score":"Aa2","factors":[{"name":"Fund Balance Ratio","value":"XX%","score":"Aa2"},{"name":"Operating Margin","value":"X.X%","score":"Aa3"}]},"management":{"score":"Aa2","factors":[{"name":"Governance","value":"Strong","score":"Aa1"},{"name":"Budget History","value":"X surpluses","score":"Aaa"}]},"debt_profile":{"score":"A1","factors":[{"name":"Debt/Revenue","value":"X.XX","score":"A1"},{"name":"Pension Funded","value":"XX%","score":"A2"}]}},"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX%","operating_margin":"X.X%","debt_outstanding":0,"debt_to_revenue":"X.XX","debt_per_capita":"$X,XXX","pension_funded_ratio":"XX%","days_cash_on_hand":0},"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],"revenue_composition":[{"category":"Property Tax","amount":0,"pct":"XX%"},{"category":"Sales Tax","amount":0,"pct":"XX%"},{"category":"Charges","amount":0,"pct":"XX%"},{"category":"Other","amount":0,"pct":"XX%"}],"expenditure_composition":[{"category":"Public Safety","amount":0,"pct":"XX%"},{"category":"General Gov","amount":0,"pct":"XX%"},{"category":"Public Works","amount":0,"pct":"XX%"},{"category":"Debt Service","amount":0,"pct":"XX%"},{"category":"Other","amount":0,"pct":"XX%"}],"debt_schedule":[{"year":"FY2026","principal":0,"interest":0,"total":0},{"year":"FY2027","principal":0,"interest":0,"total":0},{"year":"FY2028","principal":0,"interest":0,"total":0}],"peer_comparison":[{"name":"peer1","population":0,"rating":"AA+","fund_balance_ratio":"XX%","debt_per_capita":"$X,XXX","operating_margin":"X%"},{"name":"peer2","population":0,"rating":"AAA","fund_balance_ratio":"XX%","debt_per_capita":"$X,XXX","operating_margin":"X%"}],"risks":[{"title":"","severity":"medium","description":""}],"strengths":["",""],"capital_plan_summary":"1 paragraph","forward_outlook":"1 paragraph","sources":["ACFR","Budget","EMMA"]}

Fill ALL values with realistic data for this issuer. Return ONLY valid JSON.`
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("API error:", data.error);
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
    } catch {}

    if (!report) {
      return NextResponse.json({ error: "Failed to parse report" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let savedId = null;
    if (user) {
      const { data: saveData } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          issuer_name: report.issuer_name || issuerName,
          state: report.state || issuerState,
          issuer_type: report.type,
          rating: report.rating,
          sentiment: report.sentiment,
          sentiment_score: report.sentiment_score,
          report_data: report,
        })
        .select("id")
        .single();
      if (saveData) savedId = saveData.id;
    }

    return NextResponse.json({ report, savedId });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
