"use client";
import Link from "next/link";

export default function HomePage() {
  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType: "single" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  const PILL_STYLES: Record<string, { background: string; color: string }> = {
    Aaa: { background: "rgba(34, 197, 94, 0.15)", color: "rgb(21, 128, 61)" },
    Aa:  { background: "rgba(132, 204, 22, 0.18)", color: "rgb(77, 124, 15)" },
    A:   { background: "rgba(245, 158, 11, 0.18)", color: "rgb(146, 64, 14)" },
    Baa: { background: "rgba(249, 115, 22, 0.20)", color: "rgb(154, 52, 18)" },
  };

  return (
    <>
      {/* SECTION A — HERO */}
      <section style={{ padding: "5.5rem 0 4rem" }}>
        <div className="container">
          <div className="hero-grid">
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: ".45rem",
                background: "var(--accent-bg)", color: "var(--accent)",
                border: "1px solid var(--accent-line)", fontSize: ".78rem",
                fontWeight: 600, padding: ".38rem .85rem", borderRadius: 100,
                marginBottom: "1.6rem"
              }}>
                <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 8px var(--accent)" }} />
                Municipal credit research & ratings advisory
              </div>

              <h1 style={{
                fontFamily: "var(--sans)", fontSize: "clamp(2.2rem,5vw,3.6rem)",
                fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.05,
                marginBottom: "1.3rem", color: "var(--text)",
              }}>
                Municipal credit briefs and <em style={{ fontFamily: "var(--sans)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>ratings advisory.</em>
              </h1>

              <p style={{ fontSize: "1.1rem", color: "var(--text2)", maxWidth: "62ch", margin: "0 0 2rem", lineHeight: 1.6 }}>
                Research-grade credit briefs and ratings advisory for U.S. municipal issuers. Built by analysts who&apos;ve sat on both sides of the rating call — formerly at Moody&apos;s Investors Service and Wells Fargo Government Banking.
              </p>

              <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
                <a href="/sample-austin.pdf" className="btn btn-accent btn-lg">Download Austin sample</a>
                <a href="mailto:admin@munireports.com" className="btn btn-out btn-lg">Contact us</a>
              </div>
            </div>

            <div>
              <img
                src="/preview-austin-cover.png"
                alt="City of Austin sample credit brief — first page preview"
                style={{ width: "100%", height: "auto", borderRadius: 8, transform: "rotate(-2deg)", boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18), 0 4px 8px rgba(15, 23, 42, 0.06)" }}
              />
            </div>
          </div>
        </div>
        <style>{`
          .hero-grid {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 3rem;
            align-items: center;
          }
          @media (max-width: 899px) {
            .hero-grid { grid-template-columns: 1fr; gap: 2rem; }
          }
        `}</style>
      </section>

      {/* SECTION A.5 — STAT STRIP (from Austin brief) */}
      <section className="block" style={{ background: "var(--bg2)" }}>
        <div className="container">
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em" }}>From the Austin brief · May 2026</span>
            </div>
            <div className="stat-strip">
              {[
                { label: "RATING", value: "AAA / Aaa / AAA", context: "Triple-AAA from Fitch, Moody's, and S&P" },
                { label: "APPRAISED VALUE", value: "$325.4B", context: "Full taxable property value, January 2024" },
                { label: "PENSION FUNDED", value: "62.2%", context: "Combined ratio across three plans, Dec 2024" },
                { label: "MSA GROWTH", value: "4.1%", context: "5-year real GDP CAGR vs 2.1% nationally" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.5rem" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: ".6rem" }}>{s.label}</div>
                  <div style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.1, marginBottom: ".5rem" }}>{s.value}</div>
                  <div style={{ fontSize: ".85rem", color: "var(--text2)", lineHeight: 1.45 }}>{s.context}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          .stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
          @media (max-width: 899px) { .stat-strip { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 519px) { .stat-strip { grid-template-columns: 1fr; } }
        `}</style>
      </section>

      {/* SECTION B — THREE OFFERINGS */}
      <section className="block" style={{ background: "var(--bg2)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
            {/* Card 1 — Advisory */}
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.8rem", display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>Ratings prep & advisory</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-.01em", marginBottom: ".8rem" }}>Ratings preparation & advisory</h3>
              <p style={{ fontSize: ".95rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "1.5rem", flexGrow: 1 }}>
                We work with issuer finance teams 60–120 days ahead of a Moody&apos;s, S&amp;P, or Fitch rating cycle — building the credit story, anticipating analyst questions, and coaching the prep. Engagements are scoped after a conversation.
              </p>
              <a href="mailto:admin@munireports.com" className="btn btn-out" style={{ width: "100%", justifyContent: "center" }}>Get in touch →</a>
            </div>

            {/* Card 2 — On-demand briefs */}
            <div style={{ background: "var(--bg)", border: "2px solid var(--accent)", borderRadius: "var(--radius-lg)", padding: "1.8rem", display: "flex", flexDirection: "column", boxShadow: "0 4px 24px rgba(79,70,229,.12)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>On-demand briefs</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-.01em", marginBottom: ".8rem" }}>Custom credit briefs — $199</h3>
              <p style={{ fontSize: ".95rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "1.5rem", flexGrow: 1 }}>
                A polished, methodology-driven credit brief on any U.S. municipal issuer. Delivered within 5 business days. Useful for investor due diligence, refinancing analysis, treasury benchmarking, and board-level conversations.
              </p>
              <button onClick={handleCheckout} className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>Order a brief — $199</button>
            </div>

            {/* Card 3 — Sample */}
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.8rem", display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>Sample</div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-.01em", marginBottom: ".8rem" }}>Sample brief — Austin, TX</h3>
              <p style={{ fontSize: ".95rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "1.5rem", flexGrow: 1 }}>
                A 16-page credit research brief covering financials, pension obligations, the Moody&apos;s US Cities & Counties scorecard, capital plan, forward outlook, and bond market context. Free to download.
              </p>
              <a href="/sample-austin.pdf" className="btn btn-out" style={{ width: "100%", justifyContent: "center" }}>Download PDF</a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C — FEATURED BRIEF PREVIEW */}
      <section className="block">
        <div className="container">
          <div style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem", background: "var(--accent-bg)", border: "1px solid var(--accent-line)", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>Featured this cycle</div>
            <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: "1rem" }}>City of Austin, Texas — May 2026</h2>
            <p style={{ fontSize: "1rem", color: "var(--text2)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              A snapshot of one of the nation&apos;s strongest credits — triple-AAA across all three agencies, $325 billion in appraised value, and a meaningful structural fiscal challenge ahead. Covers the FY2025 ACFR, the FY2026 property tax rate increase, the three pension plans, the $4.4 billion FY26–30 capital improvement program, and the bond market context for the City&apos;s Series 2025 issuances.
            </p>
            <a href="/sample-austin.pdf" className="btn btn-accent">Download Austin brief — PDF</a>
          </div>
        </div>
      </section>

      {/* SECTION C.6 — FORWARD OUTLOOK EXCERPT (from Austin brief) */}
      <section className="block">
        <div className="container">
          <div style={{
            maxWidth: 860, margin: "0 auto",
            background: "var(--bg2)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "var(--radius-lg)",
            padding: "2rem",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em" }}>
              Forward outlook · Austin, FY2026–FY2030
            </div>
            <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, letterSpacing: "-.01em", marginTop: ".6rem", marginBottom: "1rem", color: "var(--text)" }}>
              General Fund shortfall projected to widen from $33M (FY2026) to $77.9M (FY2030).
            </h3>
            <p style={{ fontSize: "1rem", color: "var(--text2)", lineHeight: 1.7, marginBottom: "1.2rem" }}>
              Even after $20M in identified operating savings. Sales tax collections projected to decline 1.0% vs. FY2025; Hotel Occupancy Tax revenue forecast 1.5% below budget. Texas SB2&apos;s 3.5% annual revenue growth cap limits the repeatability of large rate increases.
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: ".78rem", color: "var(--text3)", fontStyle: "italic", marginBottom: "1.5rem" }}>
              Source: City of Austin FY2026–FY2030 Financial Forecast (April 2025)
            </p>
            <a href="/sample-austin.pdf" className="btn btn-out">See full forward outlook in the Austin brief →</a>
          </div>
        </div>
      </section>

      {/* SECTION C.5 — SCORECARD PREVIEW (Austin Moody's outcome) */}
      <section className="block">
        <div className="container">
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>Scorecard-Indicated Outcome</div>
              <h2 style={{ fontSize: "clamp(3rem,7vw,5rem)", fontWeight: 800, color: "var(--accent)", letterSpacing: "-.04em", lineHeight: 1, marginBottom: ".6rem" }}>Aaa.</h2>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".82rem", color: "var(--text3)", marginBottom: "1.2rem" }}>City of Austin · US Cities &amp; Counties methodology, July 24 2024</div>
              <p style={{ fontSize: "1rem", color: "var(--text2)", lineHeight: 1.6, maxWidth: "62ch", margin: "0 auto" }}>
                The scorecard-indicated outcome is computed by applying Moody&apos;s published methodology to Austin&apos;s public financial data. Eight sub-factors, weighted, mapped to buckets — every input shown.
              </p>
            </div>

            <div className="scorecard-grid">
              {[
                { name: "ECONOMIC GROWTH", value: "+2.0 pp", bucket: "Aaa" },
                { name: "RESIDENT INCOME", value: "115.5%", bucket: "Aa" },
                { name: "FULL VALUE PER CAPITA", value: "$322,000", bucket: "Aaa" },
                { name: "LIQUIDITY RATIO", value: "35.9%", bucket: "Aa" },
                { name: "FUND BALANCE RATIO", value: "43.3%", bucket: "Aaa" },
                { name: "INSTITUTIONAL FRAMEWORK", value: "Aa", bucket: "Aa" },
                { name: "FIXED-COSTS RATIO", value: "9.99%", bucket: "Aaa" },
                { name: "LONG-TERM LIABILITIES RATIO", value: "93.1%", bucket: "Aaa" },
              ].map((sf, i) => {
                const pill = PILL_STYLES[sf.bucket];
                return (
                  <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.2rem", display: "flex", flexDirection: "column", gap: ".55rem" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".1em", lineHeight: 1.3 }}>{sf.name}</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.15 }}>{sf.value}</div>
                    {sf.value !== sf.bucket && pill && (
                      <span style={{ alignSelf: "flex-start", marginTop: "auto", fontFamily: "var(--mono)", fontSize: ".72rem", fontWeight: 600, padding: ".25rem .55rem", borderRadius: 100, background: pill.background, color: pill.color, letterSpacing: ".04em" }}>{sf.bucket}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ marginTop: "2rem", fontFamily: "var(--mono)", fontSize: ".78rem", color: "var(--text3)", lineHeight: 1.55, maxWidth: "72ch", marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
              MuniReports is not affiliated with Moody&apos;s. Scorecard-Indicated Outcome is the result of applying the published methodology to public source data and is not a Moody&apos;s rating.
            </p>

            <div style={{ textAlign: "center", marginTop: "1.8rem" }}>
              <a href="/sample-austin.pdf" className="btn btn-out">See full calculation in the Austin brief →</a>
            </div>
          </div>
        </div>
        <style>{`
          .scorecard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
          @media (max-width: 899px) { .scorecard-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 519px) { .scorecard-grid { grid-template-columns: 1fr; } }
        `}</style>
      </section>

      {/* SECTION D — WHY MUNIREPORTS */}
      <section className="block" style={{ background: "var(--bg2)" }}>
        <div className="container">
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.15, marginBottom: "1.5rem" }}>
              We sit at the intersection of agency methodology and issuer reality.
            </h2>
            <p style={{ fontSize: "1rem", color: "var(--text2)", lineHeight: 1.75, marginBottom: "1.2rem" }}>
              Most municipal credit research is built for one audience or the other — academic analyses that ignore the operational pressures issuers actually face, or quick-turn ratings memos that miss how the methodology really works under the hood. We&apos;ve sat on both sides. Our briefs apply the Moody&apos;s published US Cities & Counties scorecard and US K-12 Public School Districts methodology against real ACFR and EMMA data, with every figure sourced and every scorecard sub-factor showing its inputs. They&apos;re decision-quality research, not summaries.
            </p>
            <p style={{ fontSize: "1rem", color: "var(--text2)", lineHeight: 1.75 }}>
              For issuer finance teams preparing for a rating cycle, we bring the same analytical rigor to the table — anticipating the questions analysts will ask, surfacing the weaknesses before agencies do, and shaping the credit narrative around what actually moves a rating. Practical preparation, drawn from years inside both a rating agency and a major government banking practice.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION E — CONTACT */}
      <section className="block">
        <div className="container">
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: "1rem" }}>Get in touch.</h2>
            <p style={{ fontSize: "1.05rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "1.8rem" }}>
              Tell us what you need — a single brief, a rating-cycle engagement, or a quick scoping call. We respond within one business day.
            </p>
            <a href="mailto:admin@munireports.com" className="btn btn-accent btn-lg">Email admin@munireports.com</a>
          </div>
        </div>
      </section>
    </>
  );
}
