"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FREE_REPORT_LIMIT = 1;

function getReportCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("muni_report_count") || "0", 10);
}

function incrementReportCount(): number {
  const count = getReportCount() + 1;
  localStorage.setItem("muni_report_count", String(count));
  return count;
}

export default function BuilderPage() {
  const [tab, setTab] = useState<"search">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [reportsUsed, setReportsUsed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setReportsUsed(getReportCount());
    // Check for successful purchase
    const params = new URLSearchParams(window.location.search);
    const purchased = params.get("purchased");
    if (purchased === "single") {
      // Add 1 credit
      const current = parseInt(localStorage.getItem("muni_credits") || "0", 10);
      localStorage.setItem("muni_credits", String(current + 1));
      window.history.replaceState({}, "", "/builder");
    } else if (purchased === "5pack") {
      // Add 5 credits
      const current = parseInt(localStorage.getItem("muni_credits") || "0", 10);
      localStorage.setItem("muni_credits", String(current + 5));
      window.history.replaceState({}, "", "/builder");
    }
  }, []);

  // Search only when button is clicked
  const doSearch = async () => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch("/api/search-issuers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.issuers || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  const selectIssuer = (iss: any) => {
    setSelectedIssuer(iss);
    setResults([]);
    setQuery(iss.name + ", " + iss.state);
  };

  const generateReport = async () => {
    // Check usage limit - allow if they have purchased credits
    const credits = parseInt(localStorage.getItem("muni_credits") || "0", 10);
    if (reportsUsed >= FREE_REPORT_LIMIT && credits <= 0) {
      setShowPaywall(true);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuerName: selectedIssuer?.name || query,
          issuerState: selectedIssuer?.state || "",
          documents: [],
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        // Use a purchased credit if available, otherwise count as free
        if (reportsUsed >= FREE_REPORT_LIMIT && credits > 0) {
          localStorage.setItem("muni_credits", String(credits - 1));
        } else {
          const newCount = incrementReportCount();
          setReportsUsed(newCount);
        }
        if (data.savedId) {
          router.push(`/report/${data.savedId}`);
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
    }
    setGenerating(false);
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.5rem 4rem" }}>
      <div className="no-print" style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid var(--accent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".3rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-.02em" }}>Report Builder</h1>
          <span style={{ fontSize: ".7rem", padding: ".2rem .5rem", background: "var(--accent)", color: "white", borderRadius: "999px", fontWeight: 600, letterSpacing: ".04em" }}>BETA</span>
        </div>
        <p style={{ color: "var(--text2)", fontSize: ".95rem", marginTop: ".3rem" }}>
          Search for any issuer and generate a complete AI-powered credit report in minutes.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginBottom: "1.5rem", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <button
          onClick={() => setTab("search")}
          style={{
            display: "flex", alignItems: "center", gap: ".8rem", padding: "1.1rem 1.3rem",
            background: tab === "search" ? "var(--panel)" : "var(--bg)", border: "none",
            borderRight: "1px solid var(--line)", cursor: "pointer", fontFamily: "var(--sans)",
            fontSize: ".92rem", textAlign: "left", color: "var(--text)",
            boxShadow: tab === "search" ? "inset 0 2px 0 var(--accent)" : "none",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>🔎</span>
          <span><strong style={{ display: "block" }}>Search Issuer</strong>
            <span style={{ fontWeight: 400, color: "var(--text2)", fontSize: ".82rem" }}>We find the documents for you</span>
          </span>
        </button>
      </div>

      {/* ===== SEARCH TAB ===== */}
      {tab === "search" && !report && (
        <div className="animate-in">
          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: "1.5rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: ".6rem",
              padding: ".8rem 1rem", background: "var(--panel)",
              border: "2px solid var(--line)", borderRadius: "var(--radius-lg)",
              boxShadow: "0 4px 12px rgba(22,20,18,.06)",
            }}>
              <span style={{ fontSize: "1.2rem" }}>🔎</span>
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setResults([]); }}
                onKeyDown={handleKeyDown}
                placeholder="Search 22,400 issuers — city, county, school district, utility…"
                style={{
                  border: "none", background: "transparent", fontFamily: "var(--sans)",
                  fontSize: "1rem", color: "var(--text)", flex: 1, outline: "none",
                }}
              />
              <button onClick={doSearch} className="btn btn-accent btn-sm" disabled={searching || query.length < 2}>
                {searching ? "Searching…" : "Search"}
              </button>
            </div>

            {/* Dropdown results */}
            {results.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: ".4rem",
                background: "var(--panel)", border: "1px solid var(--line)",
                borderRadius: "var(--radius)", boxShadow: "0 12px 32px rgba(22,20,18,.15)",
                zIndex: 20, overflow: "hidden",
              }}>
                {results.map((iss, i) => {
                  const initials = (iss.name || "").split(" ").filter((w: string) => w.length > 2 && !["of","the","The"].includes(w)).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                  const sub = [iss.type, iss.county, iss.state, iss.population ? `Pop. ${Number(iss.population).toLocaleString()}` : null].filter(Boolean).join(" · ");
                  return (
                    <div key={i} onClick={() => selectIssuer(iss)} style={{
                      display: "flex", alignItems: "center", gap: ".7rem",
                      padding: ".75rem 1rem", cursor: "pointer",
                      borderBottom: "1px solid var(--line-soft)",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-bg)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, background: "var(--accent-bg)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--mono)", fontWeight: 600, color: "var(--accent)", fontSize: ".72rem",
                      }}>{initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{iss.name}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>{sub}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: ".78rem", fontWeight: 600 }}>{iss.rating || "NR"}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--text3)" }}>{iss.rating_agency || "—"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected issuer card */}
          {selectedIssuer && (
            <div className="animate-in" style={{
              padding: "1.4rem", background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)", marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, background: "var(--accent-bg)",
                border: "1px solid rgba(224,78,26,.2)", display: "flex", alignItems: "center",
                justifyContent: "center", fontFamily: "var(--mono)", fontWeight: 700,
                color: "var(--accent)", fontSize: "1.1rem",
              }}>
                {(selectedIssuer.name || "").split(" ").filter((w: string) => w.length > 2).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selectedIssuer.name}, {selectedIssuer.state}</h3>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--text3)" }}>
                  {[selectedIssuer.type, selectedIssuer.county, selectedIssuer.population ? `Pop. ${Number(selectedIssuer.population).toLocaleString()}` : null].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "0 1rem", borderLeft: "1px solid var(--line)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase" }}>Rating</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{selectedIssuer.rating || "NR"}</div>
              </div>
              <button className="btn btn-out btn-sm" onClick={() => { setSelectedIssuer(null); setQuery(""); }}>✕ Change</button>
            </div>
          )}

          {/* Generate button */}
          {selectedIssuer && (
            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button className="btn btn-accent btn-lg" onClick={generateReport} disabled={generating}>
                {generating ? "⚡ Generating report… (this takes 30-60 seconds)" : "⚡ Generate Credit Report →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== UPLOAD TAB ===== */}
      

      {/* ===== GENERATED REPORT ===== */}
      {report && (
        <div className="animate-in" style={{
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
          boxShadow: "0 20px 50px -20px rgba(22,20,18,.15)",
        }}>
          <div className="no-print" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: ".75rem 1.2rem", background: "var(--bg2)", borderBottom: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: ".88rem", fontWeight: 600 }}>
              📊 Credit Report · {report.issuer_name}
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              <button className="btn btn-out btn-sm" onClick={() => { alert('Tip: In the print dialog, uncheck "Headers and footers" for a clean PDF. Then select "Save as PDF" as the destination.'); setTimeout(() => window.print(), 300); }}>📄 Download PDF</button>
              <button className="btn btn-out btn-sm" onClick={() => { setReport(null); setSelectedIssuer(null); setQuery(""); }}>
                ← New report
              </button>
            </div>
          </div>
          <div style={{ padding: "2.5rem 2.5rem", maxWidth: 900, margin: "0 auto" }}>

            {/* Print-only header */}
            <div className="report-print-header">
              <div>
                <div className="logo-text">MuniReports</div>
                <div style={{ fontSize: ".75rem", color: "#666", fontFamily: "var(--mono)" }}>Municipal Credit Analysis Report</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: ".75rem", color: "#666", fontFamily: "var(--mono)" }}>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                <div style={{ fontSize: ".75rem", color: "#1e3a5f", fontWeight: 600 }}>munireports.com</div>
              </div>
            </div>

            {/* ── HEADER ── */}
            <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--accent-soft)", textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 600, marginBottom: ".5rem" }}>
              Municipal Credit Analysis Report
            </div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "2.2rem", fontWeight: 400, marginBottom: ".4rem", lineHeight: 1.1 }}>
              {report.issuer_name}
            </h2>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "1.05rem", color: "var(--text2)", marginBottom: "1.5rem", paddingBottom: "1.2rem", borderBottom: "2px solid var(--accent)" }}>
              {report.type} · {report.state} · Rating: {report.rating}
            </div>

            {/* ── SENTIMENT + TOP KPIs ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: ".6rem", margin: "1.5rem 0", padding: "1.4rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)" }}>
              <div style={{ textAlign: "center", borderRight: "1px solid var(--line)", paddingRight: ".6rem" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>AI Sentiment</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: report.sentiment === "Positive" ? "var(--good)" : report.sentiment === "Negative" ? "var(--bad)" : "var(--warn)" }}>
                  {report.sentiment}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>Score: {report.sentiment_score}/100</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>Fund Balance</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{report.financials?.fund_balance_ratio || "N/A"}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>of expenditures</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>Op. Margin</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{report.financials?.operating_margin || "N/A"}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>net revenue</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>Debt/Revenue</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{report.financials?.debt_to_revenue || "N/A"}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>leverage ratio</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>Rating</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent-soft)" }}>{report.rating || "NR"}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>credit rating</div>
              </div>
            </div>

            {/* ── SECTION 1: EXECUTIVE SUMMARY ── */}
            <div style={{ marginTop: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                <span style={{ fontSize: "1.1rem" }}>📋</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-.01em" }}>Executive Summary</h3>
              </div>
              <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {report.executive_summary}
              </div>
            </div>

            {/* ── ECONOMY SECTION ── */}
            {report.economy && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏙️</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Economic Profile</h3>
                </div>
                <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", marginBottom: "1.2rem", whiteSpace: "pre-wrap" }}>
                  {report.economy.description}
                </div>

                {/* Economic indicators */}
                {report.economy.economic_indicators?.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(report.economy.economic_indicators.length, 4)}, 1fr)`, gap: ".8rem", marginBottom: "1.2rem" }}>
                    {report.economy.economic_indicators.map((ind: any, i: number) => (
                      <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem", textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".4rem" }}>{ind.name}</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: ind.trend === "up" ? "var(--good)" : ind.trend === "down" ? "var(--bad)" : "var(--text)" }}>{ind.value}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: ind.trend === "up" ? "var(--good)" : ind.trend === "down" ? "var(--bad)" : "var(--text3)" }}>
                          {ind.trend === "up" ? "▲ Growing" : ind.trend === "down" ? "▼ Declining" : "— Stable"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Key stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".6rem" }}>Key Economic Data</div>
                    {[
                      ["Unemployment Rate", report.economy.unemployment_rate],
                      ["Median Household Income", report.economy.median_household_income ? `$${Number(report.economy.median_household_income).toLocaleString()}` : null],
                      ["Poverty Rate", report.economy.poverty_rate],
                    ].filter(([,v]) => v).map(([label, value], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: ".4rem 0", borderBottom: "1px solid var(--line-soft)", fontSize: ".88rem" }}>
                        <span style={{ color: "var(--text2)" }}>{label}</span>
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {report.economy.top_employers?.length > 0 && (
                    <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".6rem" }}>Top Employers</div>
                      {report.economy.top_employers.map((emp: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".4rem 0", borderBottom: "1px solid var(--line-soft)", fontSize: ".88rem" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: ".75rem", color: "var(--accent)", fontWeight: 700, width: 20 }}>{i + 1}.</span>
                          <span style={{ color: "var(--text2)" }}>{emp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION 2: DETAILED FINANCIALS ── */}
            {report.financials && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>💰</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Financial Overview</h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
                  <tbody>
                    {[
                      ["Total Revenue", report.financials.total_revenue, true, "Total Expenditures", report.financials.total_expenditures, true],
                      ["Fund Balance", report.financials.fund_balance, true, "Debt Outstanding", report.financials.debt_outstanding, true],
                      ["Fund Balance Ratio", report.financials.fund_balance_ratio, false, "Operating Margin", report.financials.operating_margin, false],
                      ["Debt-to-Revenue", report.financials.debt_to_revenue, false, "Debt Per Capita", report.financials.debt_per_capita, false],
                      ["Pension Funded Ratio", report.financials.pension_funded_ratio, false, "Days Cash on Hand", report.financials.days_cash_on_hand, false],
                      ["Fixed Costs Ratio", report.financials.fixed_costs_ratio, false, "Available Reserves Ratio", report.financials.available_reserves_ratio, false],
                      ["Available Reserves", report.financials.available_reserves, true, "Total Tax-Supported Debt", report.financials.debt_outstanding, true],
                    ].filter(([,v,,, v2]) => v != null || v2 != null).map(([l1, v1, c1, l2, v2, c2], i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                        <td style={{ padding: ".85rem 1rem", fontSize: ".9rem", color: "var(--text2)", width: "30%" }}>{l1 as string}</td>
                        <td style={{ padding: ".85rem 1rem", fontFamily: "var(--mono)", fontSize: ".95rem", fontWeight: 700, width: "20%", color: "var(--text)" }}>
                          {c1 && typeof v1 === "number" ? `$${(v1 as number / 1000000).toFixed(1)}M` : v1 != null ? String(v1) : "—"}
                        </td>
                        <td style={{ padding: ".85rem 1rem", fontSize: ".9rem", color: "var(--text2)", width: "30%", borderLeft: "1px solid var(--line)" }}>{l2 as string}</td>
                        <td style={{ padding: ".85rem 1rem", fontFamily: "var(--mono)", fontSize: ".95rem", fontWeight: 700, width: "20%", color: "var(--text)" }}>
                          {c2 && typeof v2 === "number" ? `$${(v2 as number / 1000000).toFixed(1)}M` : v2 != null ? String(v2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── SECTION 3: REVENUE & EXPENDITURE TRENDS ── */}
            {report.revenue_trend?.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>📈</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Revenue & Expenditure Trends</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".75rem", color: "var(--text3)", marginLeft: "auto" }}>
                    {report.revenue_trend[0]?.year} – {report.revenue_trend[report.revenue_trend.length - 1]?.year}
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: ".8rem" }}>
                    <div>
                      <div style={{ fontSize: ".88rem", fontWeight: 600 }}>Revenue vs. Expenditures</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)" }}>
                        {report.revenue_trend[0]?.year} – {report.revenue_trend[report.revenue_trend.length - 1]?.year} · $M
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", fontFamily: "var(--mono)", fontSize: ".72rem" }}>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#1e3a5f", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }}></span>Revenue</span>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#7c3aed", borderRadius: 2, marginRight: 4, verticalAlign: "middle", opacity: .7 }}></span>Expenditures</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 500 220" style={{ width: "100%", height: "auto" }}>
                    {[0,1,2,3,4].map(i => (
                      <line key={i} x1="50" y1={25 + i * 40} x2="490" y2={25 + i * 40} stroke="var(--line)" strokeWidth="0.5" />
                    ))}
                    {(() => {
                      const rev = report.revenue_trend || [];
                      const exp = report.expenditure_trend || [];
                      const allAmounts = [...rev, ...exp].map((d: any) => d.amount).filter((a: any) => typeof a === "number");
                      const maxVal = Math.max(...allAmounts, 1);
                      const barW = Math.min(22, 300 / rev.length / 2.5);
                      const gap = 440 / rev.length;
                      return rev.map((r: any, i: number) => {
                        const x = 65 + i * gap;
                        const revH = (r.amount / maxVal) * 150;
                        const expItem = exp[i];
                        const expH = expItem ? (expItem.amount / maxVal) * 150 : 0;
                        return (
                          <g key={i}>
                            <rect x={x} y={185 - revH} width={barW} height={revH} fill="#1e3a5f" rx="2" />
                            {expH > 0 && <rect x={x + barW + 3} y={185 - expH} width={barW} height={expH} fill="#7c3aed" rx="2" opacity="0.7" />}
                            {/* Year label */}
                            <text x={x + barW + 1} y="200" fill="var(--text)" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="var(--mono)">{r.year || ""}</text>
                            {/* Revenue amount on top of bar */}
                            <text x={x + barW/2} y={180 - revH} fill="#1e3a5f" fontSize="7.5" fontWeight="600" textAnchor="middle" fontFamily="var(--mono)">
                              {typeof r.amount === "number" ? `$${(r.amount/1e6).toFixed(0)}M` : ""}
                            </text>
                            {/* Expenditure amount on top of bar */}
                            {expH > 0 && expItem && (
                              <text x={x + barW + 3 + barW/2} y={180 - expH} fill="#7c3aed" fontSize="7.5" fontWeight="600" textAnchor="middle" fontFamily="var(--mono)">
                                {typeof expItem.amount === "number" ? `$${(expItem.amount/1e6).toFixed(0)}M` : ""}
                              </text>
                            )}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Data table */}
                <div className="report-section" style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--accent)" }}>
                        <th style={{ padding: ".7rem 1rem", textAlign: "left", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", width: 100 }}></th>
                        {report.revenue_trend.map((r: any, i: number) => (
                          <th key={i} style={{ padding: ".7rem .5rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{r.year}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                        <td style={{ padding: ".7rem 1rem", fontSize: ".88rem", color: "var(--text2)", fontWeight: 600 }}>Revenue</td>
                        {report.revenue_trend.map((r: any, i: number) => (
                          <td key={i} style={{ padding: ".7rem .5rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".88rem", fontWeight: 500 }}>
                            {typeof r.amount === "number" ? `$${(r.amount / 1000000).toFixed(0)}M` : r.amount}
                          </td>
                        ))}
                      </tr>
                      {report.expenditure_trend?.length > 0 && (
                        <tr>
                          <td style={{ padding: ".7rem 1rem", fontSize: ".88rem", color: "var(--text2)", fontWeight: 600 }}>Expenses</td>
                          {report.expenditure_trend.map((r: any, i: number) => (
                            <td key={i} style={{ padding: ".7rem .5rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".88rem", fontWeight: 500 }}>
                              {typeof r.amount === "number" ? `$${(r.amount / 1000000).toFixed(0)}M` : r.amount}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SECTION 3b: SENTIMENT GAUGE + FINANCIAL HEALTH ── */}
            {/* ── MUNIREPORTS SCORE ── */}
            {report.munireports_score && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🛡️</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>MuniReports Score</h3>
                  <span style={{ fontSize: ".65rem", padding: ".15rem .45rem", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "999px", color: "var(--text2)", fontFamily: "var(--mono)" }}>INDICATOR</span>
                </div>
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.2rem", paddingBottom: "1.2rem", borderBottom: "1px solid var(--line-soft)" }}>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>Overall Score</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: ".6rem" }}>
                        <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--mono)" }}>{report.munireports_score.overall?.toFixed?.(1) || report.munireports_score.overall}</span>
                        <span style={{ fontSize: "1rem", color: "var(--text2)" }}>/ 5.0</span>
                      </div>
                      <div style={{ fontSize: "1.1rem", marginTop: ".3rem", letterSpacing: ".1em" }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ color: n <= Math.round(report.munireports_score.overall || 0) ? "#f59e0b" : "var(--line)" }}>★</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".4rem" }}>Equivalent</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)" }}>{report.munireports_score.letter_equivalent}</div>
                      <div style={{ fontSize: ".9rem", color: "var(--text2)", marginTop: ".2rem" }}>{report.munireports_score.label}</div>
                    </div>
                  </div>
                  {report.munireports_score.factors && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                      {[["economy","Economy"],["financial_strength","Financial Strength"],["debt_pension","Debt & Pension"],["forward_outlook","Forward Outlook"]].map(([key, label]) => {
                        const f = report.munireports_score.factors[key];
                        if (!f) return null;
                        return (
                          <div key={key} style={{ padding: ".8rem", background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid var(--line-soft)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".3rem" }}>
                              <span style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
                              <span style={{ fontFamily: "var(--mono)", fontSize: ".95rem", fontWeight: 700 }}>{f.score?.toFixed?.(1) || f.score}</span>
                            </div>
                            <div style={{ fontSize: ".8rem" }}>
                              {[1,2,3,4,5].map(n => (
                                <span key={n} style={{ color: n <= Math.round(f.score || 0) ? "#f59e0b" : "var(--line)", marginRight: "1px" }}>★</span>
                              ))}
                            </div>
                            {f.rationale && <div style={{ fontSize: ".78rem", color: "var(--text2)", marginTop: ".4rem", lineHeight: 1.4 }}>{f.rationale}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ marginTop: "1rem", paddingTop: ".8rem", borderTop: "1px solid var(--line-soft)", fontSize: ".72rem", color: "var(--text3)", fontStyle: "italic" }}>
                    ℹ️ {report.munireports_score.disclaimer || "MuniReports Score is an AI-generated indicator from public data, not a credit rating."}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                <span style={{ fontSize: "1.1rem" }}>🎯</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Credit Health Dashboard</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {/* Sentiment Gauge */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.5rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".8rem" }}>AI Credit Sentiment Score</div>
                  <svg viewBox="0 0 200 120" style={{ width: "180px", height: "auto", margin: "0 auto", display: "block" }}>
                    {/* Background arc */}
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" />
                    {/* Score arc */}
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
                      stroke={report.sentiment === "Positive" ? "#059669" : report.sentiment === "Negative" ? "#dc2626" : "#d97706"}
                      strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${(report.sentiment_score || 50) / 100 * 251} 251`}
                    />
                    <text x="100" y="85" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--sans)">{report.sentiment_score || "—"}</text>
                    <text x="100" y="102" textAnchor="middle" fontSize="10" fill="var(--text3)" fontFamily="var(--mono)">/ 100</text>
                  </svg>
                  <div style={{ marginTop: ".5rem", fontSize: "1.1rem", fontWeight: 700, color: report.sentiment === "Positive" ? "var(--good)" : report.sentiment === "Negative" ? "var(--bad)" : "var(--warn)" }}>
                    {report.sentiment}
                  </div>
                </div>

                {/* Financial Health Bars */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.5rem" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "1rem" }}>Key Financial Indicators</div>
                  {[
                    { label: "Fund Balance", value: report.financials?.fund_balance_ratio, pct: parseFloat(String(report.financials?.fund_balance_ratio || "0")) * (String(report.financials?.fund_balance_ratio || "").includes("%") ? 1 : 100), color: "#059669" },
                    { label: "Operating Margin", value: report.financials?.operating_margin, pct: Math.abs(parseFloat(String(report.financials?.operating_margin || "0"))) * (String(report.financials?.operating_margin || "").includes("%") ? 1 : 100), color: "#1e3a5f" },
                    { label: "Debt Coverage", value: report.financials?.debt_to_revenue, pct: Math.min(100, (1 / parseFloat(String(report.financials?.debt_to_revenue || "1"))) * 100), color: "#7c3aed" },
                  ].map((ind, i) => (
                    <div key={i} style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".3rem" }}>
                        <span style={{ fontSize: ".85rem", color: "var(--text2)" }}>{ind.label}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: ".85rem", fontWeight: 600 }}>{ind.value || "N/A"}</span>
                      </div>
                      <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, Math.max(5, ind.pct))}%`, background: ind.color, borderRadius: 4, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SECTION 4: MOODY'S-STYLE CREDIT SCORECARD ── */}
            {report.scorecard && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>📊</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Credit Scorecard</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {(["economy", "finances", "management", "debt_profile"] as const).map((pillar) => {
                    const data = (report.scorecard as any)?.[pillar];
                    if (!data) return null;
                    const labels: any = { economy: "Economy & Tax Base", finances: "Financial Performance", management: "Management & Governance", debt_profile: "Debt & Pensions" };
                    const icons: any = { economy: "🏙️", finances: "💵", management: "🏛️", debt_profile: "📉" };
                    return (
                      <div key={pillar} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                        <div style={{ padding: ".8rem 1rem", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg2)" }}>
                          <div style={{ fontWeight: 600, fontSize: ".9rem", display: "flex", alignItems: "center", gap: ".4rem" }}>{icons[pillar]} {labels[pillar]}</div>
                          <span style={{ fontFamily: "var(--mono)", fontSize: ".85rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-bg)", padding: ".2rem .6rem", borderRadius: 4 }}>{data.score}</span>
                        </div>
                        {data.factors?.map((f: any, j: number) => (
                          <div key={j} style={{ padding: ".6rem 1rem", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".85rem" }}>
                            <span style={{ color: "var(--text2)" }}>{f.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                              <span style={{ fontFamily: "var(--mono)", fontSize: ".82rem" }}>{f.value}</span>
                              <span style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--accent)", background: "var(--accent-bg)", padding: ".1rem .35rem", borderRadius: 3 }}>{f.score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECTION 5: REVENUE & EXPENDITURE COMPOSITION ── */}
            {(report.revenue_composition?.length > 0 || report.expenditure_composition?.length > 0) && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🍩</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Revenue & Expenditure Composition</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {/* Revenue donut */}
                  {report.revenue_composition?.length > 0 && (
                    <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".8rem" }}>Revenue Sources</div>
                      <svg viewBox="0 0 200 200" style={{ width: 160, height: 160, display: "block", margin: "0 auto .8rem" }}>
                        {(() => {
                          const colors = ["#1e3a5f", "#2b5278", "#7c3aed", "#059669", "#d97706", "#9ca3af"];
                          let offset = 0;
                          return report.revenue_composition.map((item: any, i: number) => {
                            const pct = parseFloat(String(item.pct)) || 0;
                            const dashLen = (pct / 100) * 314;
                            const el = <circle key={i} cx="100" cy="100" r="50" fill="none" stroke={colors[i % colors.length]} strokeWidth="30" strokeDasharray={`${dashLen} ${314 - dashLen}`} strokeDashoffset={-offset} transform="rotate(-90 100 100)" />;
                            offset += dashLen;
                            return el;
                          });
                        })()}
                        <circle cx="100" cy="100" r="35" fill="var(--panel)" />
                        <text x="100" y="96" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)" fontFamily="var(--sans)">Revenue</text>
                        <text x="100" y="110" textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{report.financials?.total_revenue ? `$${(report.financials.total_revenue/1e6).toFixed(0)}M` : ""}</text>
                      </svg>
                      {report.revenue_composition.map((item: any, i: number) => {
                        const colors = ["#1e3a5f", "#2b5278", "#7c3aed", "#059669", "#d97706", "#9ca3af"];
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: ".3rem 0", fontSize: ".82rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: ".4rem", color: "var(--text2)" }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
                              {item.category}
                            </div>
                            <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{item.pct}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Expenditure donut */}
                  {report.expenditure_composition?.length > 0 && (
                    <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".8rem" }}>Expenditure Breakdown</div>
                      <svg viewBox="0 0 200 200" style={{ width: 160, height: 160, display: "block", margin: "0 auto .8rem" }}>
                        {(() => {
                          const colors = ["#dc2626", "#1e3a5f", "#7c3aed", "#059669", "#d97706", "#9ca3af"];
                          let offset = 0;
                          return report.expenditure_composition.map((item: any, i: number) => {
                            const pct = parseFloat(String(item.pct)) || 0;
                            const dashLen = (pct / 100) * 314;
                            const el = <circle key={i} cx="100" cy="100" r="50" fill="none" stroke={colors[i % colors.length]} strokeWidth="30" strokeDasharray={`${dashLen} ${314 - dashLen}`} strokeDashoffset={-offset} transform="rotate(-90 100 100)" />;
                            offset += dashLen;
                            return el;
                          });
                        })()}
                        <circle cx="100" cy="100" r="35" fill="var(--panel)" />
                        <text x="100" y="96" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)" fontFamily="var(--sans)">Expenses</text>
                        <text x="100" y="110" textAnchor="middle" fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{report.financials?.total_expenditures ? `$${(report.financials.total_expenditures/1e6).toFixed(0)}M` : ""}</text>
                      </svg>
                      {report.expenditure_composition.map((item: any, i: number) => {
                        const colors = ["#dc2626", "#1e3a5f", "#7c3aed", "#059669", "#d97706", "#9ca3af"];
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: ".3rem 0", fontSize: ".82rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: ".4rem", color: "var(--text2)" }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
                              {item.category}
                            </div>
                            <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{item.pct}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION 6: DEBT SERVICE SCHEDULE ── */}
            {report.debt_schedule?.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>📉</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Debt Service Schedule</h3>
                </div>
                {/* Stacked bar chart */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem", marginBottom: ".8rem" }}>
                  <svg viewBox="0 0 500 180" style={{ width: "100%", height: "auto" }}>
                    {[0,1,2,3].map(i => <line key={i} x1="50" y1={20+i*40} x2="490" y2={20+i*40} stroke="var(--line)" strokeWidth="0.5" />)}
                    {(() => {
                      const maxTotal = Math.max(...report.debt_schedule.map((d: any) => d.total || 0), 1);
                      const gap = 440 / report.debt_schedule.length;
                      return report.debt_schedule.map((d: any, i: number) => {
                        const x = 60 + i * gap;
                        const pH = (d.principal / maxTotal) * 120;
                        const iH = (d.interest / maxTotal) * 120;
                        return (
                          <g key={i}>
                            <rect x={x} y={155 - pH - iH} width={gap * 0.6} height={pH} fill="#1e3a5f" rx="2" />
                            <rect x={x} y={155 - iH} width={gap * 0.6} height={iH} fill="#7c3aed" rx="2" opacity="0.6" />
                            <text x={x + gap * 0.3} y="170" fill="var(--text3)" fontSize="8" textAnchor="middle" fontFamily="var(--mono)">{d.year?.replace("FY","'")}</text>
                          </g>
                        );
                      });
                    })()}
                    <rect x="60" y="175" width="10" height="4" fill="#1e3a5f" rx="1" />
                    <text x="75" y="179" fill="var(--text2)" fontSize="7" fontFamily="var(--mono)">Principal</text>
                    <rect x="130" y="175" width="10" height="4" fill="#7c3aed" rx="1" opacity="0.6" />
                    <text x="145" y="179" fill="var(--text2)" fontSize="7" fontFamily="var(--mono)">Interest</text>
                  </svg>
                </div>
                {/* Table */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: ".7rem 1rem", borderBottom: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase" }}>
                    <div>Year</div><div style={{ textAlign: "right" }}>Principal</div><div style={{ textAlign: "right" }}>Interest</div><div style={{ textAlign: "right" }}>Total</div>
                  </div>
                  {report.debt_schedule.map((d: any, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: ".6rem 1rem", borderBottom: "1px solid var(--line-soft)", fontFamily: "var(--mono)", fontSize: ".85rem" }}>
                      <div>{d.year}</div>
                      <div style={{ textAlign: "right" }}>${(d.principal/1e6).toFixed(1)}M</div>
                      <div style={{ textAlign: "right" }}>${(d.interest/1e6).toFixed(1)}M</div>
                      <div style={{ textAlign: "right", fontWeight: 600 }}>${(d.total/1e6).toFixed(1)}M</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 7: PEER COMPARISON ── */}
            {report.peer_comparison?.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏆</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Peer Comparison</h3>
                </div>
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr .6fr .8fr .8fr .8fr", padding: ".7rem 1rem", borderBottom: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase" }}>
                    <div>Municipality</div><div style={{textAlign:"right"}}>Pop.</div><div style={{textAlign:"right"}}>Rating</div><div style={{textAlign:"right"}}>Fund Bal.</div><div style={{textAlign:"right"}}>Debt/Cap.</div><div style={{textAlign:"right"}}>Op. Margin</div>
                  </div>
                  {/* Subject issuer row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr .6fr .8fr .8fr .8fr", padding: ".7rem 1rem", borderBottom: "1px solid var(--line)", background: "var(--accent-bg)", fontSize: ".85rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>{report.issuer_name} ←</div>
                    <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{report.population ? (report.population/1000).toFixed(0) + "K" : "—"}</div>
                    <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>{report.rating}</div>
                    <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{report.financials?.fund_balance_ratio || "—"}</div>
                    <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{report.financials?.debt_per_capita || "—"}</div>
                    <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{report.financials?.operating_margin || "—"}</div>
                  </div>
                  {/* Peer issuer rows */}
                  {report.peer_comparison.map((peer: any, idx: number) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr .6fr .8fr .8fr .8fr", padding: ".7rem 1rem", borderBottom: idx < report.peer_comparison.length - 1 ? "1px solid var(--line-soft)" : "none", fontSize: ".85rem" }}>
                      <div>{peer.name || "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{peer.population ? (peer.population/1000).toFixed(0) + "K" : "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>{peer.rating || "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{peer.fund_balance_ratio || "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{peer.debt_per_capita || "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{peer.operating_margin || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 8: ESG PROFILE ── */}
            {report.esg_profile && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🌱</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>ESG Credit Profile</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".8rem" }}>
                  {[
                    { label: "Environmental", icon: "🌍", text: report.esg_profile.environmental, color: "#059669" },
                    { label: "Social", icon: "👥", text: report.esg_profile.social, color: "#7c3aed" },
                    { label: "Governance", icon: "🏛️", text: report.esg_profile.governance, color: "#1e3a5f" },
                  ].map((esg, i) => (
                    <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginBottom: ".6rem" }}>
                        <span>{esg.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{esg.label}</span>
                      </div>
                      <p style={{ fontSize: ".85rem", color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>{esg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MANAGEMENT DISCUSSION ── */}
            {report.management_discussion && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏛️</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Management & Governance</h3>
                </div>
                <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {report.management_discussion}
                </div>
              </div>
            )}
            {report.strengths?.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>✅</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Credit Strengths</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
                  {report.strengths.map((s: string, i: number) => (
                    <div key={i} style={{
                      padding: ".9rem 1rem", background: "var(--good-bg)", border: "1px solid rgba(52,211,153,.2)",
                      borderRadius: "var(--radius)", display: "flex", gap: ".6rem", alignItems: "flex-start",
                      fontSize: ".9rem", color: "var(--text)",
                    }}>
                      <span style={{ color: "var(--good)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 5: RISK ASSESSMENT ── */}
            {report.risks?.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Risk Assessment</h3>
                </div>
                {report.risks.map((risk: any, i: number) => (
                  <div key={i} style={{
                    margin: ".6rem 0", padding: "1.1rem 1.2rem",
                    borderLeft: `3px solid ${risk.severity === "high" ? "var(--bad)" : risk.severity === "medium" ? "var(--warn)" : "var(--text3)"}`,
                    background: risk.severity === "high" ? "var(--bad-bg)" : risk.severity === "medium" ? "var(--warn-bg)" : "var(--bg)",
                    borderRadius: "0 var(--radius) var(--radius) 0",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".3rem" }}>
                      <h5 style={{ fontSize: ".92rem", fontWeight: 600, color: risk.severity === "high" ? "var(--bad)" : risk.severity === "medium" ? "var(--warn)" : "var(--text2)" }}>
                        {risk.severity === "high" ? "🚩" : risk.severity === "medium" ? "⚠️" : "ℹ️"} {risk.title}
                      </h5>
                      <span style={{
                        fontFamily: "var(--mono)", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".08em",
                        padding: ".2rem .5rem", borderRadius: 4, fontWeight: 600,
                        background: risk.severity === "high" ? "var(--bad)" : risk.severity === "medium" ? "var(--warn)" : "var(--text3)",
                        color: risk.severity === "medium" ? "var(--bg)" : "#fff",
                      }}>{risk.severity}</span>
                    </div>
                    <p style={{ fontSize: ".88rem", color: "var(--text2)", margin: 0, lineHeight: 1.6 }}>{risk.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── SECTION 6: CAPITAL IMPROVEMENT PLAN ── */}
            {report.capital_plan_summary && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏗️</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Capital Improvement Plan</h3>
                </div>
                <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {report.capital_plan_summary}
                </div>
              </div>
            )}

            {/* ── PENSION & OPEB ANALYSIS ── */}
            {report.pension && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏦</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Pension & OPEB Analysis</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", marginLeft: "auto" }}>Moody&apos;s Adjusted Basis</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".8rem", marginBottom: "1rem" }}>
                  {[
                    { label: "Funded Ratio", value: report.pension.funded_ratio, color: parseFloat(report.pension.funded_ratio) > 80 ? "var(--good)" : parseFloat(report.pension.funded_ratio) > 60 ? "var(--warn)" : "var(--bad)" },
                    { label: "ANPL / Revenue", value: report.pension.anpl_to_revenue, color: parseFloat(report.pension.anpl_to_revenue) < 100 ? "var(--good)" : "var(--warn)" },
                    { label: "Contribution to ADC", value: report.pension.contribution_to_adc, color: parseFloat(report.pension.contribution_to_adc) >= 100 ? "var(--good)" : "var(--warn)" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".4rem" }}>{m.label}</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: m.color }}>{m.value || "—"}</div>
                    </div>
                  ))}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
                  <tbody>
                    {[
                      ["Pension System", report.pension.system_name],
                      ["Adjusted Net Pension Liability", report.pension.adjusted_net_pension_liability ? `$${(report.pension.adjusted_net_pension_liability/1e6).toFixed(1)}M` : null],
                      ["Annual Employer Contribution", report.pension.employer_contribution ? `$${(report.pension.employer_contribution/1e6).toFixed(1)}M` : null],
                    ].filter(([,v]) => v).map(([label, value], i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                        <td style={{ padding: ".7rem 1rem", fontSize: ".88rem", color: "var(--text2)" }}>{label}</td>
                        <td style={{ padding: ".7rem 1rem", fontFamily: "var(--mono)", fontSize: ".88rem", fontWeight: 600, textAlign: "right" }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── TAX BURDEN ANALYSIS (DIFFERENTIATOR) ── */}
            {report.tax_burden && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid #059669" }}>
                  <span style={{ fontSize: "1.1rem" }}>💲</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Tax Burden Analysis</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#fff", background: "#059669", padding: ".15rem .45rem", borderRadius: 3, marginLeft: "auto" }}>MuniReports Exclusive</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".6rem" }}>Property Tax</div>
                    {[
                      ["Tax Rate", report.tax_burden.property_tax_rate],
                      ["vs. State Average", report.tax_burden.property_tax_rate_vs_state],
                      ["Effective Rate", report.tax_burden.effective_tax_rate],
                      ["Homestead Exemption", report.tax_burden.homestead_exemption],
                    ].filter(([,v]) => v).map(([label, value], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: ".4rem 0", borderBottom: "1px solid var(--line-soft)", fontSize: ".86rem" }}>
                        <span style={{ color: "var(--text2)" }}>{label}</span>
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: String(value).toLowerCase().includes("below") ? "var(--good)" : "var(--text)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".6rem" }}>Overall Tax Burden</div>
                    {[
                      ["Total Tax Burden Per Capita", report.tax_burden.total_tax_burden_per_capita],
                      ["Sales Tax Rate", report.tax_burden.sales_tax_rate],
                    ].filter(([,v]) => v).map(([label, value], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: ".4rem 0", borderBottom: "1px solid var(--line-soft)", fontSize: ".86rem" }}>
                        <span style={{ color: "var(--text2)" }}>{label}</span>
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── HOUSING & TAX BASE (DIFFERENTIATOR) ── */}
            {report.housing && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid #059669" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏠</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Housing & Tax Base Stability</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#fff", background: "#059669", padding: ".15rem .45rem", borderRadius: 3, marginLeft: "auto" }}>MuniReports Exclusive</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".8rem" }}>
                  {[
                    { label: "Median Home Value", value: report.housing.median_home_value ? `$${(report.housing.median_home_value/1000).toFixed(0)}K` : "—" },
                    { label: "Price-to-Income", value: report.housing.median_home_value_to_income ? `${report.housing.median_home_value_to_income}×` : "—", color: parseFloat(report.housing.median_home_value_to_income) > 5 ? "var(--warn)" : "var(--good)" },
                    { label: "5Y AV Growth", value: report.housing.assessed_value_growth_5yr || "—" },
                    { label: "Homeownership", value: report.housing.homeownership_rate || "—" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".4rem" }}>{m.label}</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: m.color || "var(--text)" }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                {report.financials?.full_value_per_capita && (
                  <div style={{ marginTop: ".8rem", padding: ".8rem 1rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: ".88rem", color: "var(--text2)" }}>Full Value Per Capita</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", marginLeft: ".5rem" }}>(Moody&apos;s Key Metric)</span>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "1.1rem", fontWeight: 700 }}>{report.financials.full_value_per_capita}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── CLIMATE & DISASTER RISK (DIFFERENTIATOR) ── */}
            {report.climate_risk && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid #059669" }}>
                  <span style={{ fontSize: "1.1rem" }}>🌍</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Climate & Natural Hazard Risk</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#fff", background: "#059669", padding: ".15rem .45rem", borderRadius: 3, marginLeft: "auto" }}>MuniReports Exclusive</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
                    {[
                      { label: "Flood Risk", value: report.climate_risk.flood_risk, icon: "🌊" },
                      { label: "Wildfire Risk", value: report.climate_risk.wildfire_risk, icon: "🔥" },
                      { label: "Hurricane Risk", value: report.climate_risk.hurricane_risk, icon: "🌀" },
                      { label: "Heat Risk", value: report.climate_risk.heat_risk, icon: "🌡️" },
                    ].map((r, i) => (
                      <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: ".8rem", textAlign: "center" }}>
                        <div style={{ fontSize: "1.2rem", marginBottom: ".3rem" }}>{r.icon}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>{r.label}</div>
                        <div style={{ fontWeight: 700, fontSize: ".9rem", color: r.value === "low" ? "var(--good)" : r.value === "moderate" ? "var(--warn)" : "var(--bad)" }}>{r.value || "—"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".6rem" }}>Overall Climate Risk Score</div>
                    <div style={{ marginBottom: ".8rem" }}>
                      <span style={{ fontSize: "1.8rem", fontWeight: 700, color: /low/i.test(String(report.climate_risk.overall_score || "")) ? "var(--good)" : (/high/i.test(String(report.climate_risk.overall_score || "")) && !/moderate/i.test(String(report.climate_risk.overall_score || ""))) ? "var(--bad)" : "var(--warn)" }}>{report.climate_risk.overall_score || "—"}</span>
                    </div>
                    <p style={{ fontSize: ".85rem", color: "var(--text2)", margin: 0, lineHeight: 1.5 }}>{report.climate_risk.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── PEER COMPARISON ── */}

            {/* ── BOND MARKET PERFORMANCE (DIFFERENTIATOR) ── */}
            {report.bond_market && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid #059669" }}>
                  <span style={{ fontSize: "1.1rem" }}>📈</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Bond Market Performance</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#fff", background: "#059669", padding: ".15rem .45rem", borderRadius: 3, marginLeft: "auto" }}>MuniReports Exclusive</span>
                </div>

                {/* Summary metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".8rem", marginBottom: "1rem" }}>
                  {[
                    { label: "Total Outstanding", value: report.bond_market.total_outstanding_par ? `$${(report.bond_market.total_outstanding_par/1e6).toFixed(0)}M` : "—" },
                    { label: "Avg Coupon", value: report.bond_market.avg_coupon || "—" },
                    { label: "Avg Yield", value: report.bond_market.avg_yield || "—" },
                    { label: "Avg Spread to AAA", value: report.bond_market.avg_spread || "—", color: parseInt(report.bond_market.avg_spread) <= 25 ? "var(--good)" : parseInt(report.bond_market.avg_spread) <= 75 ? "var(--warn)" : "var(--bad)" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: ".9rem", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".3rem" }}>{m.label}</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: m.color || "var(--text)" }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Bond table */}
                {report.bond_market.outstanding_bonds?.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", marginBottom: ".8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        {["Issue", "Par Amount", "Coupon", "Maturity", "YTM", "Price", "Spread"].map(h => (
                          <th key={h} style={{ padding: ".6rem .6rem", textAlign: h === "Issue" ? "left" : "right", fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.bond_market.outstanding_bonds.map((bond: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                          <td style={{ padding: ".6rem", fontSize: ".82rem", fontWeight: 500, maxWidth: 180 }}>{bond.description}</td>
                          <td style={{ padding: ".6rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".82rem" }}>{bond.par_amount ? `$${(bond.par_amount/1e6).toFixed(1)}M` : "—"}</td>
                          <td style={{ padding: ".6rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".82rem" }}>{bond.coupon || "—"}</td>
                          <td style={{ padding: ".6rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".82rem" }}>{bond.maturity || "—"}</td>
                          <td style={{ padding: ".6rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".82rem" }}>{bond.yield_to_maturity || "—"}</td>
                          <td style={{ padding: ".6rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".82rem", fontWeight: 600 }}>{bond.price || "—"}</td>
                          <td style={{ padding: ".6rem", textAlign: "right", fontFamily: "var(--mono)", fontSize: ".82rem", color: parseInt(bond.spread_to_aaa) <= 25 ? "var(--good)" : "var(--text)" }}>{bond.spread_to_aaa || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Market commentary */}
                {report.bond_market.market_commentary && (
                  <p style={{ fontSize: ".88rem", color: "var(--text2)", margin: 0, padding: ".8rem 1rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>Market Commentary: </span>
                    {report.bond_market.market_commentary}
                  </p>
                )}
              </div>
            )}

            {/* ── AI CONFIDENCE SCORE (DIFFERENTIATOR) ── */}
            {report.ai_confidence && (
              <div className="report-section" style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid #059669" }}>
                  <span style={{ fontSize: "1.1rem" }}>🤖</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>AI Data Confidence</h3>
                  <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#fff", background: "#059669", padding: ".15rem .45rem", borderRadius: 3, marginLeft: "auto" }}>MuniReports Exclusive</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".8rem", marginBottom: ".8rem" }}>
                  {[
                    { label: "Overall Confidence", value: report.ai_confidence.overall },
                    { label: "Financial Data", value: report.ai_confidence.financials },
                    { label: "Economic Data", value: report.ai_confidence.economy },
                  ].map((c, i) => (
                    <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: ".8rem", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>{c.label}</div>
                      <div style={{ fontWeight: 700, fontSize: "1rem", textTransform: "capitalize", color: c.value === "high" ? "var(--good)" : c.value === "medium" ? "var(--warn)" : "var(--bad)" }}>{c.value || "—"}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: ".85rem", color: "var(--text2)", margin: 0, padding: ".6rem .8rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", lineHeight: 1.5, fontStyle: "italic" }}>
                  {report.ai_confidence.description || "This report was generated using AI analysis of publicly available financial documents. Data accuracy depends on the availability and recency of source documents."}
                </p>
              </div>
            )}

            {/* ── FORWARD OUTLOOK WITH CHARTS ── */}
            <div style={{ marginTop: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "2px solid var(--accent)" }}>
                <span style={{ fontSize: "1.1rem" }}>🔮</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Forward Outlook & Projections</h3>
              </div>

              {/* Outlook text */}
              {report.forward_outlook && (
                <div style={{ padding: "1.2rem 1.4rem", background: "var(--accent-bg)", border: "1px solid var(--accent-line)", borderRadius: "var(--radius)", fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap", marginBottom: "1.2rem" }}>
                  {report.forward_outlook}
                </div>
              )}
              {report.forecast?.description && (
                <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", marginBottom: "1.2rem", whiteSpace: "pre-wrap" }}>
                  {report.forecast.description}
                </div>
              )}

              {/* Revenue vs Expenditure Forecast Chart */}
              {report.forecast?.revenue_forecast?.length > 0 && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: ".8rem" }}>
                    <div>
                      <div style={{ fontSize: ".88rem", fontWeight: 600 }}>Projected Revenue vs. Expenditures</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)" }}>
                        {report.forecast.revenue_forecast[0]?.year} – {report.forecast.revenue_forecast[report.forecast.revenue_forecast.length - 1]?.year} · Baseline scenario · $M
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", fontFamily: "var(--mono)", fontSize: ".72rem" }}>
                      <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#1e3a5f", marginRight: 4, verticalAlign: "middle" }}></span>Revenue</span>
                      <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#dc2626", marginRight: 4, verticalAlign: "middle", borderTop: "1px dashed #dc2626" }}></span>Expenditures</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 500 200" style={{ width: "100%", height: "auto" }}>
                    {[0,1,2,3].map(i => <line key={i} x1="50" y1={20+i*42} x2="490" y2={20+i*42} stroke="var(--line)" strokeWidth="0.5" />)}
                    {(() => {
                      const rev = report.forecast.revenue_forecast;
                      const exp = report.forecast.expenditure_forecast || [];
                      const all = [...rev, ...exp].map((d: any) => d.amount).filter((a: any) => typeof a === "number");
                      const maxV = Math.max(...all, 1);
                      const gap = 440 / rev.length;
                      // Line chart
                      const revPoints = rev.map((r: any, i: number) => `${60 + i * gap + gap * 0.3},${175 - (r.amount / maxV) * 145}`).join(" ");
                      const expPoints = exp.map((r: any, i: number) => `${60 + i * gap + gap * 0.3},${175 - (r.amount / maxV) * 145}`).join(" ");
                      return (
                        <>
                          <polyline points={revPoints} fill="none" stroke="#1e3a5f" strokeWidth="2.5" strokeLinejoin="round" />
                          {rev.map((r: any, i: number) => <circle key={`r${i}`} cx={60 + i * gap + gap * 0.3} cy={175 - (r.amount / maxV) * 145} r="4" fill="#1e3a5f" />)}
                          {exp.length > 0 && <polyline points={expPoints} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="6 3" strokeLinejoin="round" />}
                          {exp.map((r: any, i: number) => <circle key={`e${i}`} cx={60 + i * gap + gap * 0.3} cy={175 - (r.amount / maxV) * 145} r="4" fill="#dc2626" />)}
                          {rev.map((r: any, i: number) => (
                            <g key={`l${i}`}>
                              <text x={60 + i * gap + gap * 0.3} y="190" fill="var(--text)" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="var(--mono)">{r.year || ""}</text>
                              <text x={60 + i * gap + gap * 0.3} y={165 - (r.amount / maxV) * 145} fill="#1e3a5f" fontSize="7.5" fontWeight="600" textAnchor="middle" fontFamily="var(--mono)">${(r.amount / 1e6).toFixed(0)}M</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}

              {/* Scenario Analysis Chart */}
              {report.forecast?.scenarios?.length > 0 && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: ".88rem", fontWeight: 600, marginBottom: ".15rem" }}>Scenario Analysis — Net Surplus / (Deficit)</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", marginBottom: ".8rem" }}>Three scenarios · FY2026 – FY2030 · $M</div>
                  <svg viewBox="0 0 500 200" style={{ width: "100%", height: "auto" }}>
                    {/* Zero line */}
                    <line x1="50" y1="100" x2="490" y2="100" stroke="var(--text3)" strokeWidth="0.8" strokeDasharray="4 2" />
                    <text x="45" y="103" fill="var(--text3)" fontSize="7" textAnchor="end" fontFamily="var(--mono)">$0</text>
                    {(() => {
                      const scenarios = report.forecast.scenarios;
                      const colors = ["#1e3a5f", "#059669", "#dc2626"];
                      const labels = ["Baseline", "Optimistic", "Cautious"];
                      const years = ["fy26", "fy27", "fy28", "fy29", "fy30"];
                      const yearLabels = ["FY2026", "FY2027", "FY2028", "FY2029", "FY2030"];
                      const allVals = scenarios.flatMap((s: any) => years.map(y => s[y] || 0));
                      const maxAbs = Math.max(Math.abs(Math.min(...allVals)), Math.abs(Math.max(...allVals)), 1);
                      const gap = 440 / 5;

                      return (
                        <>
                          {scenarios.map((scenario: any, si: number) => {
                            const points = years.map((y, i) => {
                              const val = scenario[y] || 0;
                              const yPos = 100 - (val / maxAbs) * 80;
                              return `${60 + i * gap + gap * 0.3},${yPos}`;
                            }).join(" ");
                            return (
                              <g key={si}>
                                <polyline points={points} fill="none" stroke={colors[si]} strokeWidth="2" strokeLinejoin="round" strokeDasharray={si === 2 ? "5 3" : "none"} />
                                {years.map((y, i) => <circle key={i} cx={60 + i * gap + gap * 0.3} cy={100 - ((scenario[y] || 0) / maxAbs) * 80} r="3" fill={colors[si]} />)}
                              </g>
                            );
                          })}
                          {yearLabels.map((l, i) => <text key={i} x={60 + i * gap + gap * 0.3} y="195" fill="var(--text3)" fontSize="8" textAnchor="middle" fontFamily="var(--mono)">{l}</text>)}
                          {/* Legend */}
                          {scenarios.map((s: any, i: number) => (
                            <g key={`leg${i}`}>
                              <line x1={60 + i * 120} y1="185" x2={72 + i * 120} y2="185" stroke={colors[i]} strokeWidth="2" strokeDasharray={i === 2 ? "4 2" : "none"} />
                              <text x={77 + i * 120} y="188" fill="var(--text2)" fontSize="7" fontFamily="var(--mono)">{s.name || labels[i]}</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Scenario table */}
                  <div style={{ marginTop: ".8rem", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr", padding: ".6rem .8rem", borderBottom: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--text3)", textTransform: "uppercase" }}>
                      <div>Scenario</div><div style={{textAlign:"right"}}>FY26</div><div style={{textAlign:"right"}}>FY27</div><div style={{textAlign:"right"}}>FY28</div><div style={{textAlign:"right"}}>FY29</div><div style={{textAlign:"right"}}>FY30</div>
                    </div>
                    {report.forecast.scenarios.map((s: any, i: number) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr", padding: ".55rem .8rem", borderBottom: "1px solid var(--line-soft)", fontSize: ".85rem" }}>
                        <div style={{ fontWeight: 600, color: i === 0 ? "#1e3a5f" : i === 1 ? "var(--good)" : "var(--bad)" }}>{s.name || ["Baseline","Optimistic","Cautious"][i]}</div>
                        {["fy26","fy27","fy28","fy29","fy30"].map(y => (
                          <div key={y} style={{ textAlign: "right", fontFamily: "var(--mono)", color: (s[y] || 0) >= 0 ? "var(--good)" : "var(--bad)" }}>
                            {(s[y] || 0) >= 0 ? "+" : ""}{typeof s[y] === "number" ? `$${s[y]}M` : s[y] || "—"}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 8: SOURCES ── */}
            {report.sources?.length > 0 && (
              <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--line)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", marginBottom: ".5rem", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Sources & References
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
                  {report.sources.map((s: string, i: number) => (
                    <span key={i} style={{ display: "inline-block", padding: ".25rem .6rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4, fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--text2)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── DATA SOURCES PER SECTION ── */}
            {report.data_sources && (
              <div style={{ marginTop: "2.5rem", padding: "1.2rem", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".8rem" }}>Data Sources by Section</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem .8rem", fontSize: ".78rem" }}>
                  {Object.entries(report.data_sources).filter(([, v]) => v).map(([key, value]) => (
                    <div key={key} style={{ paddingBottom: ".4rem", borderBottom: "1px solid var(--line-soft)" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", textTransform: "capitalize", marginBottom: ".15rem" }}>{key.replace(/_/g, " ")}</div>
                      <div style={{ color: "var(--text2)", lineHeight: 1.4 }}>{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FOOTER ── */}
            <div style={{ marginTop: "2.5rem", paddingTop: "1.2rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>
                Generated by MuniReports AI · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>
                munireports.com
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== PAYWALL MODAL ===== */}
      {showPaywall && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)",
        }} onClick={() => setShowPaywall(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--panel)", border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)", padding: "2.5rem",
            maxWidth: 520, width: "90%", textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,.3)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📊</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: ".5rem", letterSpacing: "-.02em" }}>
              You&apos;ve used your free report
            </h2>
            <p style={{ color: "var(--text2)", fontSize: ".95rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Get comprehensive credit reports with real-time data, pension analysis, bond pricing, climate risk scoring, and more — data that Moody&apos;s and S&amp;P don&apos;t provide.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem", marginBottom: "1.5rem" }}>
              <button onClick={async () => {
                const res = await fetch("/api/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceType: "single" }) });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }} style={{
                padding: "1.2rem", background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "var(--radius)", cursor: "pointer", fontFamily: "var(--sans)",
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>$4.99</div>
                <div style={{ fontSize: ".85rem", opacity: .9 }}>Single Report</div>
              </button>
              <button onClick={async () => {
                const res = await fetch("/api/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceType: "5pack" }) });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }} style={{
                padding: "1.2rem", background: "var(--bg)", color: "var(--text)", border: "2px solid var(--accent)",
                borderRadius: "var(--radius)", cursor: "pointer", fontFamily: "var(--sans)",
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>$19.99</div>
                <div style={{ fontSize: ".85rem", color: "var(--text2)" }}>5-Pack <span style={{ color: "var(--good)", fontWeight: 600 }}>Save 20%</span></div>
              </button>
            </div>

            <div style={{ fontSize: ".82rem", color: "var(--text2)", marginBottom: "1rem" }}>
              Need unlimited reports? <a href="mailto:admin@munireports.com?subject=Unlimited%20Pricing" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Contact us</a>
            </div>

            <button onClick={() => setShowPaywall(false)} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: ".85rem", cursor: "pointer", fontFamily: "var(--sans)" }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
