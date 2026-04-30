import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState } = await req.json();

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [{
        role: "user",
        content: `You are a municipal credit analyst. Search the web for financial information about "${issuerName}" in ${issuerState || "the United States"} and generate a credit report. Search for their most recent ACFR, budget, bond issuances, credit ratings, and financial data. Generate a JSON object with: issuer_name, state, type, rating, sentiment (Positive|Neutral|Negative), sentiment_score (0-100), executive_summary (2-3 paragraphs), financials (total_revenue, total_expenditures, fund_balance, fund_balance_ratio, operating_margin, debt_outstanding, debt_to_revenue), risks (array of {title, severity high|medium|low, description}), strengths (array of strings), capital_plan_summary, forward_outlook, sources (array). Return ONLY the JSON object, no markdown, no backticks.`
      }],
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
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
      const { data } = await supabase
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
    }

    return NextResponse.json({ report, savedId });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
