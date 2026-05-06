import Link from "next/link";

export const metadata = {
  title: "About — MuniReports",
  description: "About MuniReports — AI-powered municipal credit analysis.",
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>About MuniReports</h1>
      <p style={{ color: "var(--ink-mute)", fontSize: "1.05rem", marginBottom: "2.5rem" }}>
        Fast, structured credit analysis for the U.S. municipal bond market.
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Why we built this</h2>
        <p>
          The U.S. municipal bond market is enormous — over $4 trillion outstanding across more than 50,000 issuers — but
          credit research hasn&apos;t kept up. Traditional rating agency reports cost hundreds of dollars and arrive months
          after the underlying disclosures are published. Smaller investors, community banks, and individual analysts have
          historically been priced out of professional-grade research.
        </p>
        <p>
          MuniReports closes that gap. We use modern AI to generate structured credit analysis in under two minutes, drawing
          from the same public disclosures the rating agencies use, at a fraction of the cost.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>What makes us different</h2>
        <ul>
          <li><strong>Speed.</strong> Reports generate in 60–90 seconds, not weeks.</li>
          <li><strong>Price.</strong> $4.99 per report instead of $300+.</li>
          <li><strong>Coverage.</strong> Any U.S. municipal issuer, on demand.</li>
          <li>
            <strong>Differentiated data.</strong> We surface tax burden, housing affordability, climate risk, and bond market
            performance — the things bond investors actually need that traditional rating reports often bury or omit.
          </li>
          <li><strong>Transparency.</strong> Every report cites its sources and shows AI confidence levels.</li>
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
        <Link href="/builder" className="btn btn-accent">Try it free →</Link>
      </div>
    </main>
  );
}
