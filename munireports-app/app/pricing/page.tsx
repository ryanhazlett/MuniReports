"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "Must be logged in") {
        router.push("/signup?next=pricing");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  return (
    <div className="container" style={{ padding: "3rem 1.5rem 4rem" }}>
      <div className="block-head">
        <div className="block-eyebrow">Pricing</div>
        <h2>The analysis is <em>free.</em> Save your work for a fee.</h2>
        <p>Search any issuer, upload documents, and generate credit reports — completely free, no account required. Create an account to save reports, build a library, and collaborate with your team.</p>
      </div>
      <div className="pricing-grid">
        <div className="price-card">
          <div className="price-name">Free</div>
          <div className="price-desc">Full analysis power. No account needed.</div>
          <div className="price-amount">$0</div>
          <div className="price-detail">Free forever · No credit card</div>
          <Link href="/builder" className="btn btn-out">Start analyzing →</Link>
          <ul className="price-features">
            <li>Unlimited report generation</li>
            <li>Unlimited document uploads</li>
            <li>Issuer search & auto-doc pull</li>
            <li>AI chat with any bond</li>
            <li>5-year analysis & forward projections</li>
            <li>PDF export of any report</li>
          </ul>
          <div style={{ marginTop: "1rem", paddingTop: ".8rem", borderTop: "1px solid var(--line)", fontSize: ".82rem", color: "var(--text3)", fontStyle: "italic" }}>
            Reports expire after your session ends
          </div>
        </div>
        <div className="price-card feat">
          <div className="price-badge">Save Your Work</div>
          <div className="price-name">Pro</div>
          <div className="price-desc">Everything free, plus a permanent report library.</div>
          <div className="price-amount">$49<sub>/mo</sub></div>
          <div className="price-detail">Per user · Annual: $468/yr (save 20%)</div>
          <button className="btn btn-accent" onClick={handleUpgrade}>Upgrade to Pro →</button>
          <ul className="price-features">
            <li>Everything in Free</li>
            <li><strong>Saved report library</strong></li>
            <li><strong>Report history & versioning</strong></li>
            <li><strong>Issuer watchlists</strong> with alerts</li>
            <li><strong>Shareable report links</strong></li>
            <li>Custom report branding</li>
            <li>Priority support</li>
          </ul>
        </div>
        <div className="price-card">
          <div className="price-name">Team</div>
          <div className="price-desc">Shared workspace for firms.</div>
          <div className="price-amount">$29<sub>/user/mo</sub></div>
          <div className="price-detail">5 user minimum</div>
          <a className="btn btn-out" href="mailto:team@munireports.com">Talk to sales</a>
          <ul className="price-features">
            <li>Everything in Pro</li>
            <li><strong>Shared team library</strong></li>
            <li><strong>Audit trail</strong></li>
            <li>REST API + MCP server</li>
            <li>SSO / SAML</li>
            <li>Dedicated CSM</li>
          </ul>
        </div>
      </div>

      <div style={{ margin: "3rem auto", maxWidth: 760, textAlign: "center", padding: "2rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)" }}>
        <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: ".5rem" }}>Why is the analysis free?</div>
        <p style={{ color: "var(--text2)", fontSize: ".95rem", lineHeight: 1.6, margin: 0 }}>
          We believe every analyst, banker, and finance officer should have access to AI-powered credit research — regardless of budget.
          The analysis engine costs us very little per report. What costs money is storing, versioning, and serving your report library over time.
        </p>
      </div>
    </div>
  );
}
