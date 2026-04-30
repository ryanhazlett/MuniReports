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
              <button className="btn btn-out btn-sm" onClick={() => { setReport(null); setSelectedIssuer(null); setQuery(""); }}>
                ← New report
              </button>
            </div>
          </div>
          <div style={{ padding: "2rem 2.2rem", maxWidth: 800 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, marginBottom: ".5rem" }}>
              Executive Summary
            </div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "2rem", fontWeight: 500, marginBottom: ".4rem" }}>
              {report.issuer_name}
            </h2>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "1rem", color: "var(--text2)", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--line)" }}>
              {report.type} · {report.state} · Rating: {report.rating}
            </div>

            {/* Sentiment + KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".8rem", margin: "1.5rem 0", padding: "1.2rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Sentiment</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: report.sentiment === "Positive" ? "var(--good)" : report.sentiment === "Negative" ? "var(--bad)" : "var(--warn)" }}>
                  {report.sentiment}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>Score: {report.sentiment_score}</div>
              </div>
              {report.financials?.fund_balance_ratio && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Fund Balance</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{report.financials.fund_balance_ratio}</div>
                </div>
              )}
              {report.financials?.operating_margin && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Op. Margin</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{report.financials.operating_margin}</div>
                </div>
              )}
              {report.financials?.debt_to_revenue && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", marginBottom: ".3rem" }}>Debt/Revenue</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{report.financials.debt_to_revenue}</div>
                </div>
              )}
            </div>

            {/* Summary text */}
            <div style={{ fontSize: ".95rem", lineHeight: 1.7, color: "var(--text)", marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
              {report.executive_summary}
            </div>

            {/* Risks */}
            {report.risks?.length > 0 && (
              <>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: ".8rem", marginTop: "2rem" }}>Risk Assessment</h3>
                {report.risks.map((risk: any, i: number) => (
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
              </>
            )}

            {/* Forward outlook */}
            {report.forward_outlook && (
              <>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: ".8rem", marginTop: "2rem" }}>Forward Outlook</h3>
                <p style={{ fontSize: ".95rem", lineHeight: 1.7, color: "var(--text)" }}>{report.forward_outlook}</p>
              </>
            )}

            {/* Sources */}
            {report.sources?.length > 0 && (
              <div style={{ marginTop: "2rem", paddingTop: "1.2rem", borderTop: "1px solid var(--line)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--text3)" }}>
                  Sources: {report.sources.map((s: string, i: number) => (
                    <span key={i} style={{ display: "inline-block", margin: ".1rem .15rem", padding: ".15rem .45rem", background: "var(--bg)", border: "1px solid var(--line-soft)", borderRadius: 3 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
