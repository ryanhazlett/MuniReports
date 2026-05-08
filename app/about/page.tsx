import Link from "next/link";

export const metadata = {
  title: "About — MuniReports",
  description: "About MuniReports — AI-assisted municipal credit research.",
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>About MuniReports</h1>
      <p style={{ color: "var(--ink-mute)", fontSize: "1.05rem", marginBottom: "2.5rem" }}>
        Fast, structured credit research for the U.S. municipal bond market.
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Why we built this</h2>
        <p>
          The U.S. municipal bond market is enormous — over $4 trillion outstanding across more than 50,000 issuers — but
          credit research hasn&apos;t kept up. Traditional rating agency reports cost hundreds of dollars and arrive months
          after the underlying disclosures are published. Smaller investors, community banks, and individual analysts have
          historically been priced out of subscription-based research.
        </p>
        <p>
          MuniReports offers an alternative starting point. We use AI to compile public disclosures into a structured research brief in under two minutes — research access at a price point professional services can&apos;t match.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>What makes us different</h2>
        <ul>
          <li><strong>Speed.</strong> Research briefs generate in 60–90 seconds.</li>
          <li><strong>Price.</strong> $4.99 per research brief.</li>
          <li><strong>Coverage.</strong> Any U.S. municipal issuer, on demand.</li>
          <li>
            <strong>Differentiated data.</strong> We surface tax burden, housing affordability, climate risk, and bond market
            performance — public data points that aren&apos;t easy to assemble across sources.
          </li>
          <li><strong>Transparency.</strong> Each report lists its sources.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>What we are not</h2>
        <p>
          MuniReports is not a credit rating agency. We are not registered as an NRSRO with the SEC. Our sentiment scores are
          research output meant to inform analysis, not replace ratings from Moody&apos;s, S&amp;P, Fitch, or KBRA. Reports are
          for informational purposes and do not constitute investment, legal, or tax advice.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Get in touch</h2>
        <p>
          Questions, feedback, or interested in unlimited access? Reach us at{" "}
          <a href="mailto:admin@munireports.com">admin@munireports.com</a>.
        </p>
      </section>

      <div style={{ marginTop: "3rem" }}>
        <Link href="/builder" className="btn btn-accent">Try it →</Link>
      </div>
    </main>
  );
}
