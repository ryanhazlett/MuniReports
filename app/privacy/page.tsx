import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — MuniReports",
  description: "MuniReports Privacy Policy.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "var(--ink-mute)", fontSize: "0.95rem", marginBottom: "2.5rem" }}>
        Last updated: May 5, 2026
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2>1. Overview</h2>
        <p>
          MuniReports (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates munireports.com (the &quot;Service&quot;).
          This Privacy Policy explains what information we collect, how we use it, and the rights you have regarding your
          information.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>2. Information we collect</h2>
        <p><strong>Account information.</strong> When you create an account, we collect your email address and a hashed password via our authentication provider, Supabase.</p>
        <p><strong>Payment information.</strong> Payments are processed by Stripe. We do not store credit card numbers or full payment details on our servers. Stripe provides us with a transaction reference and the last four digits of the card used.</p>
        <p><strong>Usage information.</strong> We log basic operational data including request logs and order references to operate and improve the Service.</p>
        <p><strong>Technical information.</strong> Like most websites, we automatically collect IP address, browser type, device type, and similar technical data.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>3. How we use information</h2>
        <ul>
          <li>To operate and provide the Service</li>
          <li>To process payments and manage your account</li>
          <li>To improve report accuracy and product features</li>
          <li>To respond to support requests</li>
          <li>To send essential service notifications (e.g., billing receipts)</li>
          <li>To detect, prevent, and address fraud or abuse</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>4. Service providers</h2>
        <p>We share information only with the third-party providers needed to operate the Service:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication and database hosting</li>
          <li><strong>Vercel</strong> — application hosting</li>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Anthropic</strong> — AI model that generates report content</li>
          <li><strong>Google Workspace</strong> — email</li>
        </ul>
        <p>Each of these providers has its own privacy practices. We do not sell your personal information to third parties.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>5. AI processing</h2>
        <p>
          We use AI internally as part of our research workflow, including Anthropic&apos;s Claude API, to draft initial content from ACFR data and other public sources. All AI-assisted output is reviewed, verified, and finalized by MuniReports analysts before delivery to customers. AI does not directly produce customer-facing deliverables.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>6. Cookies</h2>
        <p>
          We use cookies and similar technologies for essential functionality (keeping you signed in, processing payments) and
          basic analytics. We do not use third-party advertising cookies.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>7. Data retention</h2>
        <p>
          We retain account information and saved reports as long as your account is active. If you delete your account, we
          delete associated personal data within 30 days, except where retention is legally required (e.g., payment records
          for tax purposes).
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>8. Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal information at any time by emailing{" "}
          <a href="mailto:admin@munireports.com">admin@munireports.com</a>. Depending on where you live, you may have
          additional rights under laws such as the California Consumer Privacy Act (CCPA) or the EU General Data Protection
          Regulation (GDPR).
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>9. Security</h2>
        <p>
          We use industry-standard security practices including encrypted connections (HTTPS), encrypted password storage, and
          access controls. No system is perfectly secure, however, and we cannot guarantee absolute security.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>10. Children</h2>
        <p>The Service is not directed at children under 16, and we do not knowingly collect information from children.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>11. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated via email or a notice on
          the Service. Continued use after changes constitutes acceptance.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>12. Contact</h2>
        <p>
          Privacy questions? Email <a href="mailto:admin@munireports.com">admin@munireports.com</a>.
        </p>
      </section>

      <div style={{ marginTop: "3rem" }}>
        <Link href="/" className="btn btn-out">← Back to home</Link>
      </div>
    </main>
  );
}
