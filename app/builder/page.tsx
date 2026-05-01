"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function BuilderPage() {
  const [tab, setTab] = useState<"search" | "upload">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const debounceRef = useRef<any>(null);
  const router = useRouter();

  // Debounced issuer search
  const handleSearch = (val: string) => {
    setQuery(val);
    if (val.length < 3) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const doSearch = async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch("/api/search-issuers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data.issuers || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const selectIssuer = (iss: any) => {
    setSelectedIssuer(iss);
    setResults([]);
    setQuery(iss.name + ", " + iss.state);
  };

  const generateReport = async () => {
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
        if (data.savedId) {
          router.push(`/report/${data.savedId}`);
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
    }
    setGenerating(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.5rem 4rem" }}>
      <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--line)" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-.02em" }}>Report Builder</h1>
        <p style={{ color: "var(--text2)", fontSize: ".95rem", marginTop: ".3rem" }}>
          Search for any issuer or upload your own documents to generate a complete AI-powered credit report.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginBottom: "1.5rem", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
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
        <button
          onClick={() => setTab("upload")}
          style={{
            display: "flex", alignItems: "center", gap: ".8rem", padding: "1.1rem 1.3rem",
            background: tab === "upload" ? "var(--panel)" : "var(--bg)", border: "none",
            cursor: "pointer", fontFamily: "var(--sans)", fontSize: ".92rem", textAlign: "left",
            color: "var(--text)",
            boxShadow: tab === "upload" ? "inset 0 2px 0 var(--accent)" : "none",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>📄</span>
          <span><strong style={{ display: "block" }}>Upload Documents</strong>
            <span style={{ fontWeight: 400, color: "var(--text2)", fontSize: ".82rem" }}>Drag & drop your own files</span>
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
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search 22,400 issuers — city, county, school district, utility…"
                style={{
                  border: "none", background: "transparent", fontFamily: "var(--sans)",
                  fontSize: "1rem", color: "var(--text)", flex: 1, outline: "none",
                }}
              />
              {searching && <span style={{ fontSize: ".82rem", color: "var(--text3)" }}>Searching…</span>}
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
      {tab === "upload" && !report && (
        <div className="animate-in">
          <div
            className="upload-zone"
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <div className="upload-icon">📄</div>
            <h4>Drag & drop your documents here</h4>
            <p style={{ fontSize: ".92rem", color: "var(--text2)", margin: ".5rem 0 1rem" }}>or click to browse · Upload multiple files at once</p>
            <div style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--text3)" }}>
              Accepted: PDF · XLSX · CSV · Scanned documents OK · Max 100 MB per file
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              {uploadedFiles.map((file, i) => (
                <div key={i} className="doc-item">
                  <div className="doc-icon os">PDF</div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: ".88rem" }}>{file.name}</div>
                    <small style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </small>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--text2)" }}>Detecting…</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--text2)", display: "flex", alignItems: "center", gap: ".3rem" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--warn)", animation: "pulse 1s infinite" }} />
                    Queued
                  </div>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: "1px solid var(--line-soft)",
                      background: "var(--bg)", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer", fontSize: ".8rem", color: "var(--text3)",
                    }}
                  >×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button className="btn btn-accent btn-lg" onClick={generateReport} disabled={generating}>
                  {generating ? "⚡ Generating…" : "⚡ Generate Credit Report →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== GENERATED REPORT ===== */}
      {report && (
        <div className="animate-in" style={{
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
          boxShadow: "0 20px 50px -20px rgba(22,20,18,.15)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: ".75rem 1.2rem", background: "var(--bg2)", borderBottom: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: ".88rem", fontWeight: 600 }}>
              📊 Credit Report · {report.issuer_name}
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              <button className="btn btn-out btn-sm" onClick={() => window.print()}>📄 Print / PDF</button>
              <button className="btn btn-out btn-sm" onClick={() => { setReport(null); setSelectedIssuer(null); setQuery(""); }}>
                ← New report
              </button>
            </div>
          </div>
          <div style={{ padding: "2.5rem 2.5rem", maxWidth: 900, margin: "0 auto" }}>

            {/* ── HEADER ── */}
            <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--accent-soft)", textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 600, marginBottom: ".5rem" }}>
              Municipal Credit Analysis Report
            </div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "2.2rem", fontWeight: 400, marginBottom: ".4rem", lineHeight: 1.1 }}>
              {report.issuer_name}
            </h2>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "1.05rem", color: "var(--text2)", marginBottom: "1.5rem", paddingBottom: "1.2rem", borderBottom: "1px solid var(--line)" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: "1.1rem" }}>📋</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-.01em" }}>Executive Summary</h3>
              </div>
              <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {report.executive_summary}
              </div>
            </div>

            {/* ── SECTION 2: DETAILED FINANCIALS ── */}
            {report.financials && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "1.1rem" }}>💰</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Financial Overview</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  {[
                    ["Total Revenue", report.financials.total_revenue, true],
                    ["Total Expenditures", report.financials.total_expenditures, true],
                    ["Fund Balance", report.financials.fund_balance, true],
                    ["Debt Outstanding", report.financials.debt_outstanding, true],
                    ["Fund Balance Ratio", report.financials.fund_balance_ratio, false],
                    ["Operating Margin", report.financials.operating_margin, false],
                    ["Debt-to-Revenue", report.financials.debt_to_revenue, false],
                  ].filter(([, val]) => val != null).map(([label, value, isCurrency], i) => (
                    <div key={i} style={{
                      padding: "1rem 1.2rem",
                      borderBottom: "1px solid var(--line)",
                      borderRight: i % 2 === 0 ? "1px solid var(--line)" : "none",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: ".9rem", color: "var(--text2)" }}>{label as string}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: ".95rem", fontWeight: 600 }}>
                        {isCurrency && typeof value === "number" ? `$${(value as number / 1000000).toFixed(1)}M` : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 3: REVENUE & EXPENDITURE TRENDS ── */}
            {report.revenue_trend?.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "1.1rem" }}>📈</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Revenue & Expenditure Trends</h3>
                </div>

                {/* SVG Bar Chart */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1.2rem", marginBottom: "1rem" }}>
                  <svg viewBox="0 0 500 220" style={{ width: "100%", height: "auto" }}>
                    {/* Grid lines */}
                    {[0,1,2,3,4].map(i => (
                      <line key={i} x1="50" y1={25 + i * 40} x2="490" y2={25 + i * 40} stroke="var(--line)" strokeWidth="0.5" />
                    ))}
                    {/* Bars */}
                    {(() => {
                      const rev = report.revenue_trend || [];
                      const exp = report.expenditure_trend || [];
                      const allAmounts = [...rev, ...exp].map((d: any) => d.amount).filter((a: any) => typeof a === "number");
                      const maxVal = Math.max(...allAmounts, 1);
                      const barW = Math.min(20, 300 / rev.length / 2.5);
                      const gap = 460 / rev.length;
                      return rev.map((r: any, i: number) => {
                        const x = 60 + i * gap;
                        const revH = (r.amount / maxVal) * 150;
                        const expItem = exp[i];
                        const expH = expItem ? (expItem.amount / maxVal) * 150 : 0;
                        return (
                          <g key={i}>
                            <rect x={x} y={185 - revH} width={barW} height={revH} fill="#1e3a5f" rx="2" opacity="0.9" />
                            {expH > 0 && <rect x={x + barW + 3} y={185 - expH} width={barW} height={expH} fill="#7c3aed" rx="2" opacity="0.7" />}
                            <text x={x + barW} y="200" fill="var(--text3)" fontSize="8" textAnchor="middle" fontFamily="var(--mono)">{r.year?.replace("FY","'")}</text>
                            <text x={x + barW/2} y={180 - revH} fill="var(--text2)" fontSize="7" textAnchor="middle" fontFamily="var(--mono)">
                              {typeof r.amount === "number" ? `$${(r.amount/1000000).toFixed(0)}M` : ""}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    {/* Legend */}
                    <rect x="60" y="210" width="10" height="5" fill="#1e3a5f" rx="1" />
                    <text x="75" y="215" fill="var(--text2)" fontSize="8" fontFamily="var(--mono)">Revenue</text>
                    <rect x="140" y="210" width="10" height="5" fill="#7c3aed" rx="1" />
                    <text x="155" y="215" fill="var(--text2)" fontSize="8" fontFamily="var(--mono)">Expenditures</text>
                  </svg>
                </div>

                {/* Data table */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(${report.revenue_trend.length}, 1fr)`, gap: 0, padding: ".8rem 1rem", borderBottom: "1px solid var(--line)", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    <div></div>
                    {report.revenue_trend.map((r: any, i: number) => (
                      <div key={i} style={{ textAlign: "right" }}>{r.year}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `100px repeat(${report.revenue_trend.length}, 1fr)`, gap: 0, padding: ".8rem 1rem", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ fontSize: ".88rem", color: "var(--text2)" }}>Revenue</div>
                    {report.revenue_trend.map((r: any, i: number) => (
                      <div key={i} style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: ".88rem", fontWeight: 500 }}>
                        {typeof r.amount === "number" ? `$${(r.amount / 1000000).toFixed(0)}M` : r.amount}
                      </div>
                    ))}
                  </div>
                  {report.expenditure_trend?.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: `100px repeat(${report.expenditure_trend.length}, 1fr)`, gap: 0, padding: ".8rem 1rem" }}>
                      <div style={{ fontSize: ".88rem", color: "var(--text2)" }}>Expenses</div>
                      {report.expenditure_trend.map((r: any, i: number) => (
                        <div key={i} style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: ".88rem", fontWeight: 500 }}>
                          {typeof r.amount === "number" ? `$${(r.amount / 1000000).toFixed(0)}M` : r.amount}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION 3b: SENTIMENT GAUGE + FINANCIAL HEALTH ── */}
            <div style={{ marginTop: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                  {report.peer_comparison.map((p: any, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr .8fr .6fr .8fr .8fr .8fr", padding: ".7rem 1rem", borderBottom: "1px solid var(--line-soft)", fontSize: ".85rem" }}>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", color: "var(--text2)" }}>{p.population ? (p.population/1000).toFixed(0) + "K" : "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>{p.rating}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", color: "var(--text2)" }}>{p.fund_balance_ratio || "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", color: "var(--text2)" }}>{p.debt_per_capita || "—"}</div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", color: "var(--text2)" }}>{p.operating_margin || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 8: ESG PROFILE ── */}
            {report.esg_profile && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏗️</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Capital Improvement Plan</h3>
                </div>
                <div style={{ fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {report.capital_plan_summary}
                </div>
              </div>
            )}

            {/* ── SECTION 7: FORWARD OUTLOOK ── */}
            {report.forward_outlook && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1rem", paddingBottom: ".6rem", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "1.1rem" }}>🔮</span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Forward Outlook</h3>
                </div>
                <div style={{ padding: "1.2rem 1.4rem", background: "var(--accent-bg)", border: "1px solid rgba(99,102,241,.2)", borderRadius: "var(--radius)", fontSize: ".95rem", lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {report.forward_outlook}
                </div>
              </div>
            )}

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
    </div>
  );
}
