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
          Professional credit reports. <em style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>Fair pricing.</em>
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text2)", maxWidth: "50ch", margin: "0 auto" }}>
          Get the same depth of analysis as Moody&apos;s and S&amp;P — plus exclusive data they don&apos;t provide — at a fraction of the cost.
        </p>
      </div>

      <div className="pricing-grid">
        {/* Free */}
        <div className="price-card">
          <div className="price-name">Free</div>
          <div className="price-desc">Try MuniReports risk-free</div>
          <div className="price-amount">$0</div>
          <div className="price-detail">1 free report</div>
          <Link href="/builder" className="btn btn-out" style={{ width: "100%", justifyContent: "center" }}>Generate free report →</Link>
          <ul className="price-features">
            <li><strong>1 credit report</strong> — any issuer</li>
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
          <div className="price-desc">One comprehensive credit report</div>
          <div className="price-amount">$4.99</div>
          <div className="price-detail">per report · one-time purchase</div>
          <button onClick={() => handleCheckout("single")} className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>Buy report — $4.99 →</button>
          <ul className="price-features">
            <li><strong>Everything in Free, plus:</strong></li>
            <li>Web-sourced real-time data (latest FY)</li>
            <li>Pension &amp; OPEB analysis (Moody&apos;s adjusted)</li>
            <li>Bond market performance &amp; spreads</li>
            <li>Tax burden analysis <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#059669", fontWeight: 600 }}>EXCLUSIVE</span></li>
            <li>Housing &amp; tax base stability <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#059669", fontWeight: 600 }}>EXCLUSIVE</span></li>
            <li>Climate &amp; hazard risk score <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "#059669", fontWeight: 600 }}>EXCLUSIVE</span></li>
            <li>Peer comparison table</li>
            <li>Forward outlook with scenario analysis</li>
            <li>AI confidence transparency</li>
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
            <li><strong>5 full credit reports</strong></li>
            <li>Everything in Single Report</li>
            <li>Use anytime — credits never expire</li>
            <li>Best value for active investors</li>
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

      {/* Comparison to competitors */}
      <div style={{ maxWidth: 800, margin: "4rem auto", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1.5rem" }}>How we compare</h3>
        <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: ".8rem 1rem", textAlign: "left", fontSize: ".85rem" }}>Feature</th>
                <th style={{ padding: ".8rem .6rem", textAlign: "center", fontSize: ".85rem", color: "var(--accent)", fontWeight: 700 }}>MuniReports</th>
                <th style={{ padding: ".8rem .6rem", textAlign: "center", fontSize: ".85rem", color: "var(--text2)" }}>Moody&apos;s</th>
                <th style={{ padding: ".8rem .6rem", textAlign: "center", fontSize: ".85rem", color: "var(--text2)" }}>S&amp;P</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Price per report", "$4.99", "$300-500", "$250-400"],
                ["Turnaround time", "< 2 minutes", "2-4 weeks", "2-4 weeks"],
                ["Issuers covered", "22,400+", "~15,000", "~18,000"],
                ["Tax burden analysis", "✓", "✗", "✗"],
                ["Climate risk scoring", "✓", "Limited", "Limited"],
                ["Bond pricing data", "✓", "✗", "✗"],
                ["Housing affordability", "✓", "✗", "✗"],
                ["AI confidence score", "✓", "✗", "✗"],
              ].map(([feature, muni, moodys, sp], i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: ".65rem 1rem", fontSize: ".88rem", color: "var(--text2)" }}>{feature}</td>
                  <td style={{ padding: ".65rem .6rem", textAlign: "center", fontFamily: "var(--mono)", fontSize: ".85rem", fontWeight: 600, color: muni === "✓" ? "var(--good)" : "var(--text)" }}>{muni}</td>
                  <td style={{ padding: ".65rem .6rem", textAlign: "center", fontFamily: "var(--mono)", fontSize: ".85rem", color: moodys === "✗" ? "var(--bad)" : "var(--text2)" }}>{moodys}</td>
                  <td style={{ padding: ".65rem .6rem", textAlign: "center", fontFamily: "var(--mono)", fontSize: ".85rem", color: sp === "✗" ? "var(--bad)" : "var(--text2)" }}>{sp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
