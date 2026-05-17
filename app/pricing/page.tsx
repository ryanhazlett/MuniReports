"use client";
import Link from "next/link";

export default function PricingPage() {
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
    <div className="container" style={{ padding: "4rem 1.5rem 5rem" }}>
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 3rem" }}>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: ".8rem" }}>
          Engagement options
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text2)", lineHeight: 1.6 }}>
          Three ways to work with MuniReports — from a single research brief on the issuer of your choice to a full rating-cycle preparation engagement.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        {/* Block 1 — Ratings prep & advisory */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2rem" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>Ratings prep &amp; advisory</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-.01em", marginBottom: "1rem" }}>Ratings preparation &amp; advisory</h2>
          <p style={{ fontSize: ".98rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "1rem" }}>
            For issuer finance teams preparing for a Moody&apos;s, S&amp;P, or Fitch rating cycle. We engage 60–120 days ahead of the rating call to build the credit story, anticipate analyst questions, and coach the prep team through dry runs.
          </p>
          <p style={{ fontSize: ".98rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "1.5rem" }}>
            Engagements are scoped after a conversation. Pricing depends on issuer size, credit complexity, and scope. Contact us to discuss.
          </p>
          <a href="mailto:admin@munireports.com" className="btn btn-out">Get in touch →</a>
        </div>

        {/* Block 2 — On-demand briefs $199 */}
        <div style={{ background: "var(--bg)", border: "2px solid var(--accent)", borderRadius: "var(--radius-lg)", padding: "2rem", boxShadow: "0 4px 24px rgba(79,70,229,.12)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>On-demand briefs</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-.01em", marginBottom: "1rem" }}>Custom credit briefs — $199</h2>
          <p style={{ fontSize: ".98rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "1rem" }}>
            A polished, methodology-driven credit brief on any U.S. municipal issuer of your choice. Roughly 16 pages covering financials, pension obligations, the Moody&apos;s US Cities &amp; Counties scorecard applied to your issuer&apos;s data, capital plan, forward outlook, and bond market context.
          </p>
          <p style={{ fontSize: ".98rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "1.5rem" }}>
            Useful for investor due diligence, refinancing analysis, treasury benchmarking, and board-level conversations. Delivered to your email within 5 business days of order. One-time payment via Stripe.
          </p>
          <button onClick={handleCheckout} className="btn btn-accent">Order a brief — $199</button>
        </div>

        {/* Block 3 — Sample */}
        <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2rem" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: ".8rem" }}>Sample</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-.01em", marginBottom: "1rem" }}>Sample brief — City of Austin, TX</h2>
          <p style={{ fontSize: ".98rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "1.5rem" }}>
            Want to see what a brief actually looks like before you order? Download our complete Austin, TX brief — 16 pages, free, no email required.
          </p>
          <a href="/sample-austin.pdf" className="btn btn-out">Download PDF</a>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "3rem auto 0", textAlign: "center" }}>
        <p style={{ fontSize: ".9rem", color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>
          MuniReports is not a Nationally Recognized Statistical Rating Organization (NRSRO). Briefs are research output, not credit ratings. See <Link href="/terms">Terms</Link> for full disclosures.
        </p>
      </div>
    </div>
  );
}
