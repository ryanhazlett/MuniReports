import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60;

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
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Generate a municipal credit report as JSON for "${issuerName}" in ${issuerState || "US"}. Be concise. Return ONLY valid JSON with these fields: issuer_name (string), state (string), type (string), population (number), rating (string), rating_outlook (string), sentiment ("Positive" or "Neutral" or "Negative"), sentiment_score (number 0-100), executive_summary (2 short paragraphs), financials (object with total_revenue as number, total_expenditures as number, fund_balance as number, fund_balance_ratio as string like "18.4%", operating_margin as string like "4.3%", debt_outstanding as number, debt_to_revenue as string like "1.62"), revenue_trend (array of 5 objects with year string and amount number), expenditure_trend (array of 5 objects with year string and amount number), revenue_composition (array of 4 objects with category string and pct string), expenditure_composition (array of 4 objects with category string and pct string), risks (array of 2 objects with title string, severity string, description string), strengths (array of 3 strings), forward_outlook (1 paragraph), sources (array of 3 strings). Use realistic data. No markdown. No backticks. Just JSON.`
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
      console.error("Parse error:", e, "Text:", text.substring(0, 200));
    }

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
