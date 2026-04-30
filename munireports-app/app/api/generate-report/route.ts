import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState, documents } = await req.json();

    // Generate the credit report using AI with web search
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `You are a municipal credit analyst. Search the web for financial information about "${issuerName}" in ${issuerState || "the United States"} and generate a comprehensive credit report.

Search for their most recent ACFR, budget, bond issuances, credit ratings, and financial data.

Generate a JSON object with these fields:
{
  "issuer_name": "full official name",
  "state": "2-letter state",
  "type": "City/County/School District/etc",
  "rating": "credit rating or NR",
  "sentiment": "Positive|Neutral|Negative",
  "sentiment_score": number 0-100,
  "executive_summary": "2-3 paragraph executive summary with key findings",
  "financials": {
    "total_revenue": number or null,
    "total_expenditures": number or null,
    "fund_balance": number or null,
    "fund_balance_ratio": "percentage string",
    "operating_margin": "percentage string",
    "debt_outstanding": number or null,
    "debt_to_revenue": "ratio string"
  },
  "revenue_trend": [{"year": "FYxxxx", "amount": number}],
  "expenditure_trend": [{"year": "FYxxxx", "amount": number}],
  "risks": [{"title": "risk title", "severity": "high|medium|low", "description": "explanation"}],
  "strengths": ["strength 1", "strength 2"],
  "capital_plan_summary": "1-2 paragraphs about CIP if found",
  "forward_outlook": "1-2 paragraphs about future projections",
  "sources": ["source 1", "source 2"]
}

Return ONLY the JSON object. No markdown, no backticks, no explanation.`
      }],
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }

    let report = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) report = JSON.parse(match[0]);
    } catch { /* parse error */ }

    if (!report) {
      return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }

    // If user is logged in, save to database
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let savedId = null;
    if (user) {
      const { data, error } = await supabase
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

      if (data) savedId = data.id;
      if (error) console.error("Save error:", error);
    }

    return NextResponse.json({ report, savedId });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
