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

  return (
    <>
      {/* SECTION A — HERO */}
      <section style={{ padding: "5.5rem 0 4rem" }}>
        <div className="container">
          <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
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

            <p style={{ fontSize: "1.1rem", color: "var(--text2)", maxWidth: "62ch", margin: "0 auto 2rem", lineHeight: 1.6 }}>
              Research-grade credit briefs and ratings advisory for U.S. municipal issuers. Built by analysts who&apos;ve sat on both sides of the rating call — formerly at Moody&apos;s Investors Service and Wells Fargo Government Banking.
            </p>

            <div style={{ display: "flex", gap: ".7rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/sample-austin.pdf" className="btn btn-accent btn-lg">Download Austin sample</a>
              <a href="mailto:admin@munireports.com" className="btn btn-out btn-lg">Contact us</a>
            </div>
          </div>
        </div>
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
