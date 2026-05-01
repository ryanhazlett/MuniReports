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
        model: "claude-sonnet-4-6-20250415",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `You are a municipal credit analyst. Using your knowledge, generate a comprehensive credit report for "${issuerName}" in ${issuerState || "the United States"}. Generate a JSON object with: issuer_name, state, type, rating, sentiment (Positive|Neutral|Negative), sentiment_score (0-100), executive_summary (2-3 paragraphs), financials (total_revenue, total_expenditures, fund_balance, fund_balance_ratio, operating_margin, debt_outstanding, debt_to_revenue), risks (array of {title, severity high|medium|low, description}), strengths (array of strings), capital_plan_summary, forward_outlook, sources (array). Return ONLY the JSON object, no markdown, no backticks.`
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
