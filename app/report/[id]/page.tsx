import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) return notFound();

  const r = report.report_data;

  return (
    <div className="container" style={{ padding: "2rem 1.5rem 4rem" }}>
      <div style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)", overflow: "hidden",
        boxShadow: "0 20px 50px -20px rgba(22,20,18,.15)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: ".75rem 1.2rem", background: "var(--bg2)",
          borderBottom: "1px solid var(--line)",
        }}>
          <div style={{ fontSize: ".88rem", fontWeight: 600 }}>
            📊 Credit Report · {r?.issuer_name || report.issuer_name}
          </div>
          <div style={{ display: "flex", gap: ".4rem" }}>
            <Link href="/dashboard" className="btn btn-out btn-sm">← My Reports</Link>
            <Link href="/builder" className="btn btn-accent btn-sm">+ New Report</Link>
          </div>
        </div>
        <div style={{ padding: "2rem 2.2rem", maxWidth: 800 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, marginBottom: ".5rem" }}>
            AI-Assisted Municipal Issuer Brief
          </div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "2rem", fontWeight: 500, marginBottom: ".4rem" }}>
            {r?.issuer_name || report.issuer_name}
          </h2>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "1rem", color: "var(--text2)", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--line)" }}>
            {r?.type || report.issuer_type} · {r?.state || report.state} · Rating: {r?.rating || report.rating}
          </div>

          {/* TODO: report.created_at is when the row was saved, not when the underlying report data was generated. For accuracy, store and use the original generated_at from cached_reports. Tracked for follow-up. */}
          <div style={{
            margin: "1rem 0 1.5rem",
            padding: ".75rem 1rem",
            background: "var(--bg2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            fontSize: ".82rem",
            fontStyle: "italic",
            color: "var(--text2)",
            lineHeight: 1.5,
          }}>
            Snapshot dated {new Date(report.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. This report is AI-generated preliminary research compiled from public sources via web search. Figures may vary between generations and should be verified against primary source documents (ACFRs, EMMA filings, official statements) before any investment, lending, or financial decision. Not a credit rating. Not investment advice.
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".8rem", margin: "1.5rem 0", padding: "1.2rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Sentiment</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: report.sentiment === "Positive" ? "var(--good)" : report.sentiment === "Negative" ? "var(--bad)" : "var(--warn)" }}>
                {report.sentiment}
              </div>
            </div>
            {r?.financials?.fund_balance_ratio && <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Fund Balance</div><div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{r.financials.fund_balance_ratio}</div></div>}
            {r?.financials?.operating_margin && <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Op. Margin</div><div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{r.financials.operating_margin}</div></div>}
            {r?.financials?.debt_to_revenue && <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Debt/Revenue</div><div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{r.financials.debt_to_revenue}</div></div>}
          </div>

          {/* Summary */}
          <div style={{ fontSize: ".95rem", lineHeight: 1.7, marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
            {r?.executive_summary}
          </div>

          {/* Risks */}
          {r?.risks?.map((risk: any, i: number) => (
            <div key={i} style={{
              margin: ".6rem 0", padding: "1rem",
              borderLeft: `3px solid ${risk.severity === "high" ? "var(--bad)" : "var(--warn)"}`,
              background: risk.severity === "high" ? "var(--bad-bg)" : "var(--warn-bg)",
              borderRadius: "0 var(--radius) var(--radius) 0",
            }}>
              <h5 style={{ fontSize: ".88rem", fontWeight: 600, color: risk.severity === "high" ? "var(--bad)" : "var(--warn)", marginBottom: ".3rem" }}>
                {risk.severity === "high" ? "🚩" : "⚠️"} {risk.title}
              </h5>
              <p style={{ fontSize: ".88rem", color: "var(--text2)", margin: 0 }}>{risk.description}</p>
            </div>
          ))}

          {/* Forward outlook */}
          {r?.forward_outlook && (
            <>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: ".8rem", marginTop: "2rem" }}>Forward Outlook</h3>
              <p style={{ fontSize: ".95rem", lineHeight: 1.7 }}>{r.forward_outlook}</p>
            </>
          )}

          {/* Sources */}
          {r?.sources?.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1.2rem", borderTop: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>
              Sources: {r.sources.map((s: string, i: number) => (
                <span key={i} style={{ display: "inline-block", margin: ".1rem .15rem", padding: ".15rem .45rem", background: "var(--bg)", border: "1px solid var(--line-soft)", borderRadius: 3 }}>{s}</span>
              ))}
            </div>
          )}

          <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", marginTop: "1rem" }}>
            Generated {new Date(report.created_at).toLocaleString()} · Report ID: {report.id}
          </div>
        </div>
      </div>
    </div>
  );
}
