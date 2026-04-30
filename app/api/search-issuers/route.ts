import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || query.length < 2) {
      return NextResponse.json({ issuers: [] });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [{
        role: "user",
        content: `Search the web for the municipal government issuer: "${query}". Return ONLY a JSON array of up to 6 matching U.S. municipal issuers (cities, counties, school districts, utilities, special districts, states). Each object should have: name (official name), type (City, County, School District, Utility, Special District, State), state (2-letter), county (county name or null), population (number or null), rating (S&P or Moody's credit rating if known, or "NR"), rating_agency ("S&P", "Moody's", or "—"). Return ONLY the JSON array, no markdown, no explanation, no backticks.`
      }],
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }

    let issuers: any[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) issuers = JSON.parse(match[0]);
    } catch { /* parse error */ }

    return NextResponse.json({ issuers });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ issuers: [], error: "Search failed" }, { status: 500 });
  }
}
