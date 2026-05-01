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
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `You are a senior municipal credit analyst producing a comprehensive credit report similar to Moody's format. Using your knowledge, generate a detailed credit analysis for "${issuerName}" in ${issuerState || "the United States"}.

Return a JSON object with ALL of these fields populated with realistic data based on your knowledge:

{
  "issuer_name": "full official name",
  "state": "2-letter",
  "type": "City/County/School District/etc",
  "population": number,
  "rating": "credit rating",
  "rating_outlook": "Stable/Positive/Negative",
  "sentiment": "Positive|Neutral|Negative",
  "sentiment_score": number 0-100,
  "executive_summary": "3-4 paragraph detailed executive summary",

  "scorecard": {
    "economy": { "score": "Aaa/Aa/A/Baa/Ba", "factors": [{"name": "Tax Base Size", "value": "$XX billion", "score": "Aaa"}, {"name": "Full Value Per Capita", "value": "$XXX,XXX", "score": "Aa"}, {"name": "Median Family Income", "value": "$XX,XXX", "score": "Aa"}, {"name": "Economic Diversification", "value": "description", "score": "Aaa"}] },
    "finances": { "score": "Aaa/Aa/A/Baa/Ba", "factors": [{"name": "Fund Balance as % of Revenue", "value": "XX.X%", "score": "Aa"}, {"name": "5-Year Revenue Trend", "value": "+X.X% CAGR", "score": "Aa"}, {"name": "Cash Balance as % of Revenue", "value": "XX.X%", "score": "A"}, {"name": "Operating Margin", "value": "X.X%", "score": "Aa"}] },
    "management": { "score": "Aaa/Aa/A/Baa/Ba", "factors": [{"name": "Institutional Framework", "value": "description", "score": "Aa"}, {"name": "Operating History", "value": "X consecutive surpluses", "score": "Aaa"}, {"name": "Budget Flexibility", "value": "description", "score": "Aa"}] },
    "debt_profile": { "score": "Aaa/Aa/A/Baa/Ba", "factors": [{"name": "Debt to Revenue", "value": "X.XX", "score": "A"}, {"name": "Debt to Full Value", "value": "X.X%", "score": "Aa"}, {"name": "Debt per Capita", "value": "$X,XXX", "score": "A"}, {"name": "Pensions & OPEB", "value": "X.X% of revenue", "score": "A"}] }
  },

  "financials": {
    "total_revenue": number,
    "total_expenditures": number,
    "fund_balance": number,
    "fund_balance_ratio": "XX.X%",
    "operating_margin": "X.X%",
    "debt_outstanding": number,
    "debt_to_revenue": "X.XX",
    "debt_per_capita": "$X,XXX",
    "pension_funded_ratio": "XX.X%",
    "days_cash_on_hand": number,
    "tax_collection_rate": "XX.X%",
    "top_10_taxpayers_pct": "XX.X%"
  },

  "revenue_trend": [{"year": "FY20XX", "amount": number}, ...for 5 years],
  "expenditure_trend": [{"year": "FY20XX", "amount": number}, ...for 5 years],

  "revenue_composition": [{"category": "Property Tax", "amount": number, "pct": "XX.X%"}, {"category": "Sales Tax", "amount": number, "pct": "XX.X%"}, {"category": "Charges for Services", "amount": number, "pct": "XX.X%"}, {"category": "Intergovernmental", "amount": number, "pct": "XX.X%"}, {"category": "Other", "amount": number, "pct": "XX.X%"}],

  "expenditure_composition": [{"category": "Public Safety", "amount": number, "pct": "XX.X%"}, {"category": "General Government", "amount": number, "pct": "XX.X%"}, {"category": "Public Works", "amount": number, "pct": "XX.X%"}, {"category": "Culture & Recreation", "amount": number, "pct": "XX.X%"}, {"category": "Debt Service", "amount": number, "pct": "XX.X%"}, {"category": "Other", "amount": number, "pct": "XX.X%"}],

  "debt_schedule": [{"year": "FY20XX", "principal": number, "interest": number, "total": number}, ...for 5 years],

  "peer_comparison": [{"name": "peer city name", "population": number, "rating": "rating", "fund_balance_ratio": "XX.X%", "debt_per_capita": "$X,XXX", "operating_margin": "X.X%"}, ...for 4-5 peers],

  "risks": [{"title": "risk", "severity": "high|medium|low", "description": "detail"}],
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "esg_profile": {"environmental": "description", "social": "description", "governance": "description"},
  "capital_plan_summary": "2-3 paragraphs about CIP",
  "forward_outlook": "2-3 paragraphs",
  "management_discussion": "1-2 paragraphs about governance and management quality",
  "sources": ["source 1", "source 2", "source 3"]
}

Return ONLY the JSON object. No markdown, no backticks. Populate every field with realistic data.`
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic API error:", data.error);
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
      return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
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
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
