"use client";
import Link from "next/link";

export default function PricingPage() {
  const handleCheckout = async (priceType: string) => {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
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
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: ".76rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".16em", marginBottom: ".8rem" }}>Pricing</div>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.1, marginBottom: ".8rem" }}>
          Credit research, on demand. <em style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>Fair pricing.</em>
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text2)", maxWidth: "50ch", margin: "0 auto" }}>
          Compile public financial data into a structured research brief in minutes. A starting point for credit analysis at a price point professional services can&apos;t match.
        </p>
      </div>

      <div className="pricing-grid">
        {/* Free */}
        <div className="price-card">
          <div className="price-name">Free</div>
          <div className="price-desc">Try MuniReports — no account needed</div>
          <div className="price-amount">$0</div>
          <div className="price-detail">1 free report</div>
          <Link href="/builder" className="btn btn-out" style={{ width: "100%", justifyContent: "center" }}>Generate a research brief →</Link>
          <ul className="price-features">
            <li><strong>1 research brief</strong> — any issuer</li>
            <li>Executive summary &amp; financial overview</li>
            <li>Revenue &amp; expenditure analysis</li>
            <li>Risk assessment &amp; credit strengths</li>
            <li>AI sentiment score</li>
            <li>Print / PDF export</li>
          </ul>
        </div>

        {/* Single Report */}
        <div className="price-card feat">
          <div className="price-badge">Most Popular</div>
          <div className="price-name">Single Report</div>
          <div className="price-desc">One research brief</div>
          <div className="price-amount">$4.99</div>
          <div className="price-detail">per report · one-time purchase</div>
          <button onClick={() => handleCheckout("single")} className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>Buy brief — $4.99 →</button>
          <ul className="price-features">
            <li><strong>Everything in Free, plus:</strong></li>
            <li>Web-sourced public data (latest available FY)</li>
            <li>Pension &amp; OPEB analysis (adjusted basis)</li>
            <li>Bond market performance &amp; spreads</li>
            <li>Tax burden analysis</li>
            <li>Housing &amp; tax base stability</li>
            <li>Climate &amp; hazard risk score</li>
            <li>Peer comparison table</li>
            <li>Forward outlook with scenario analysis</li>
          </ul>
        </div>

        {/* 5-Pack */}
        <div className="price-card">
          <div className="price-name">5-Pack</div>
          <div className="price-desc">Five reports at a discount</div>
          <div className="price-amount">$19.99</div>
          <div className="price-detail">$4.00 per report · save 20%</div>
          <button onClick={() => handleCheckout("5pack")} className="btn btn-out" style={{ width: "100%", justifyContent: "center" }}>Buy 5-pack — $19.99 →</button>
          <ul className="price-features">
            <li><strong>5 research briefs</strong></li>
            <li>Everything in Single Report</li>
            <li>Use anytime — credits never expire</li>
            <li>Best value for repeat use</li>
          </ul>
        </div>
      </div>

      {/* Enterprise */}
      <div style={{
        maxWidth: 1100, margin: "2rem auto 0", padding: "2rem", textAlign: "center",
        background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ textAlign: "left" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: ".3rem" }}>Unlimited Reports</h3>
            <p style={{ fontSize: ".92rem", color: "var(--text2)", margin: 0 }}>
              For financial advisors, institutions, and teams who need unlimited access. Custom pricing based on your needs.
            </p>
          </div>
          <a href="mailto:admin@munireports.com?subject=MuniReports%20Unlimited%20Pricing%20Inquiry" className="btn btn-accent" style={{ flexShrink: 0 }}>
            Contact us →
          </a>
        </div>
      </div>

      {/* NRSRO disclaimer */}
      <div style={{ maxWidth: 800, margin: "4rem auto", textAlign: "center" }}>
        <p style={{ fontSize: ".95rem", color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>
          MuniReports is research output, not a credit rating. We&apos;re not registered as an NRSRO and our briefs aren&apos;t a substitute for ratings from Moody&apos;s, S&amp;P, Fitch, or KBRA. We cover ~22,400 U.S. municipal issuers, including many that aren&apos;t rated by the agencies.
        </p>
      </div>
    </div>
  );
}
