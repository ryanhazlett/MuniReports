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
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [{
        role: "user",
        content: `Search the web for the municipal government issuer: "${query}". Return ONLY a JSON array of up to 6 matching U.S. municipal issuers. Each object should have: name, type (City/County/School District/Utility/Special District/State), state (2-letter), county (or null), population (number or null), rating (credit rating or "NR"), rating_agency ("S&P" or "Moody's" or ""). Return ONLY the JSON array, no markdown, no backticks.`
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
    } catch {}

    return NextResponse.json({ issuers });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ issuers: [], error: "Search failed" }, { status: 500 });
  }
}
