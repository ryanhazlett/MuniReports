import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 300;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callClaude(apiKey: string, prompt: string) {
  const body: any = {
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  };

  const maxAttempts = 4;
  const backoffs = [3000, 8000, 20000];
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok && !data.error) return data;

      const errType = data?.error?.type || "";
      const isRetryable =
        response.status === 429 ||
        response.status === 529 ||
        response.status >= 500 ||
        errType === "rate_limit_error" ||
        errType === "overloaded_error" ||
        errType === "api_error";

      lastError = data;
      if (!isRetryable) {
        console.error(`Non-retryable error (${response.status}):`, JSON.stringify(data.error));
        return data;
      }
      if (attempt === maxAttempts - 1) {
        console.error(`All ${maxAttempts} attempts exhausted.`, JSON.stringify(data.error));
        return data;
      }
      const wait = backoffs[attempt];
      console.warn(`Retryable error attempt ${attempt + 1}/${maxAttempts}. Waiting ${wait}ms.`);
      await sleep(wait);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1) {
        return { error: { type: "network_error", message: String(err) } };
      }
      await sleep(backoffs[attempt]);
    }
  }
  return lastError || { error: { type: "unknown", message: "All retries failed" } };
}

function extractJSON(data: any): any {
  let text = "";
  if (data?.content) {
    for (const block of data.content) {
      if (block.type === "text") text += block.text;
    }
  }
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      let j = match[0];
      let ob = (j.match(/\{/g) || []).length;
      let cb = (j.match(/\}/g) || []).length;
      let oq = (j.match(/\[/g) || []).length;
      let cq = (j.match(/\]/g) || []).length;
      while (cq < oq) { j += "]"; cq++; }
      while (cb < ob) { j += "}"; cb++; }
      j = j.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");
      return JSON.parse(j);
    }
  } catch (e) {
    console.error("JSON parse error:", e, "Text length:", text.length);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { issuerName, issuerState } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY || "";

    const prompt = `Search the web for "${issuerName}" in ${issuerState || "US"}. Find their latest ACFR, budget, CIP, EMMA bond filings, pension data, ratings actions, and economic data. Then return ONLY valid JSON. NO markdown. NO backticks. NO explanation outside the JSON.

CRITICAL FORMATTING RULES:
- All percentage fields must be SHORT numbers like "31.4%" — never with parenthetical explanations
- All "pct" fields just like "40%" — no explanations inside data fields
- Long context belongs ONLY in description/summary/narrative fields
- Fill EVERY field. Use "—" or 0 for unknown values, but try web search first.
- Write all narrative text in NORMAL SENTENCE CASE. Do NOT title-case. Example correct: "Wildland-urban interface areas in western Austin present ongoing risk." Example WRONG: "Wildland-Urban Interface Areas In Western Austin Present Ongoing Risk."
- For climate_risk.overall_score: provide a single phrase like "Moderate" or "Moderate-High" or "High" — NOT a number/10 fraction.
- For bond_market.outstanding_bonds: every bond MUST have a "price" value (estimate using YTM and coupon if not directly available, format as "$XXX.XX") and a "spread_to_aaa" value in basis points (estimate from yield comparison if needed, format as "XX bps"). Never leave price or spread blank.
- For bond_market.avg_spread: compute the average of the per-bond spreads and report as "XX bps". Never leave blank.

Return this JSON structure:
{"issuer_name":"","state":"","type":"","population":0,"rating":"","rating_outlook":"Stable","sentiment":"Positive","sentiment_score":85,
"executive_summary":"2-3 paragraphs with specific data",
"economy":{"description":"paragraph","unemployment_rate":"X.X%","median_household_income":0,"poverty_rate":"X.X%","top_employers":["","","","",""],"economic_indicators":[{"name":"GDP Growth","value":"X.X%","trend":"up"},{"name":"Employment","value":"XX,XXX","trend":"up"},{"name":"Population","value":"XX,XXX","trend":"up"},{"name":"Permits","value":"X,XXX","trend":"up"}]},
"financials":{"total_revenue":0,"total_expenditures":0,"fund_balance":0,"fund_balance_ratio":"XX.X%","operating_margin":"X.X%","debt_outstanding":0,"debt_to_revenue":"X.XX","debt_per_capita":"$X,XXX","days_cash_on_hand":0,"pension_funded_ratio":"XX%"},
"revenue_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"expenditure_trend":[{"year":"FY2021","amount":0},{"year":"FY2022","amount":0},{"year":"FY2023","amount":0},{"year":"FY2024","amount":0},{"year":"FY2025","amount":0}],
"revenue_composition":[{"category":"Property Tax","pct":"XX%"},{"category":"Sales Tax","pct":"XX%"},{"category":"Charges","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"expenditure_composition":[{"category":"Public Safety","pct":"XX%"},{"category":"General Gov","pct":"XX%"},{"category":"Public Works","pct":"XX%"},{"category":"Debt Service","pct":"XX%"},{"category":"Other","pct":"XX%"}],
"strengths":["specific strength 1","specific strength 2","specific strength 3"],
"risks":[{"title":"","severity":"high","description":"specific risk with numbers"},{"title":"","severity":"medium","description":""},{"title":"","severity":"low","description":""}],
"capital_plan_summary":"1-2 paragraph CIP narrative — total size, themes, funding mix",
"pension":{"system_name":"","funded_ratio":"XX.X%","anpl":0,"contribution_to_adc":"XXX%"},
"bond_market":{"outstanding_bonds":[{"description":"GO Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"},{"description":"Revenue Bonds Series 20XX","par_amount":0,"coupon":"X.XX%","maturity":"20XX","yield_to_maturity":"X.XX%","price":"$XXX.XX","spread_to_aaa":"XX bps"}],"total_outstanding_par":0,"avg_coupon":"X.XX%","avg_yield":"X.XX%","avg_spread":"XX bps","market_commentary":"1-2 sentences on trading conditions in normal sentence case"},
"tax_burden":{"property_tax_rate":"","property_tax_rate_vs_state":"","total_tax_burden_per_capita":"","sales_tax_rate":"","homestead_exemption":""},
"housing":{"median_home_value":0,"median_home_value_to_income":"","assessed_value_growth_5yr":"","homeownership_rate":""},
"climate_risk":{"flood_risk":"sentence in normal case","wildfire_risk":"sentence in normal case","hurricane_risk":"sentence in normal case","heat_risk":"sentence in normal case","overall_score":"Moderate","description":"1-2 sentences in normal case"},
"forecast":{"description":"1 paragraph on near-term outlook","revenue_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"expenditure_forecast":[{"year":"FY2026","amount":0},{"year":"FY2027","amount":0},{"year":"FY2028","amount":0},{"year":"FY2029","amount":0},{"year":"FY2030","amount":0}],"scenarios":[{"name":"Baseline","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Optimistic","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0},{"name":"Cautious","fy26":0,"fy27":0,"fy28":0,"fy29":0,"fy30":0}]},
"forward_outlook":"1-2 paragraphs on 5-year outlook and key drivers",
"peer_comparison":[{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""},{"name":"","population":0,"rating":"","fund_balance_ratio":"","debt_per_capita":"","operating_margin":""}],
"sources":["ACFR","Budget","EMMA","Census","other source"]}

CRITICAL: scenarios fy26-fy30 are NET SURPLUS or DEFICIT in millions (e.g. 7 = +$7M surplus, -3 = -$3M deficit). NOT total revenue.
Make the JSON complete and valid. Close all braces and brackets.`;

    const apiResponse = await callClaude(apiKey, prompt);

    if (apiResponse?.error) {
      console.error("API error:", JSON.stringify(apiResponse.error));
      return NextResponse.json({ error: apiResponse.error.message || "Generation failed" }, { status: 500 });
    }

    const report = extractJSON(apiResponse);
    if (!report) {
      return NextResponse.json({ error: "Failed to parse report. Please try again." }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let savedId = null;
    if (user) {
      try {
        const { data: saveData } = await supabase.from("reports").insert({
          user_id: user.id,
          issuer_name: report.issuer_name || issuerName,
          state: report.state || issuerState,
          issuer_type: report.type,
          rating: report.rating,
          sentiment: report.sentiment,
          sentiment_score: report.sentiment_score,
          report_data: report,
        }).select("id").single();
        if (saveData) savedId = saveData.id;
      } catch (saveErr) {
        console.error("Save failed:", saveErr);
      }
    }

    return NextResponse.json({ report, savedId });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
