import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || query.length < 2) {
      return NextResponse.json({ issuers: [] });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a municipal finance database. The user searched for: "${query}". Return a JSON array of up to 6 real U.S. municipal issuers that match this search. Use your knowledge of real cities, counties, school districts, utilities, and special districts. Each object should have: name (official name), type (City/County/School District/Utility/Special District), state (2-letter), county (county name or null), population (number or null), rating (likely S&P or Moody's credit rating based on your knowledge, or "NR"), rating_agency ("S&P" or "Moody's" or ""). Return ONLY the JSON array, no markdown, no backticks, no explanation.`
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic API error:", data.error);
      return NextResponse.json({ issuers: [], error: data.error.message }, { status: 500 });
    }

    let text = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") text += block.text;
      }
    }

    let issuers: any[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) issuers = JSON.parse(match[0]);
    } catch {}

    return NextResponse.json({ issuers });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ issuers: [], error: "Search failed" }, { status: 500 });
  }
}
