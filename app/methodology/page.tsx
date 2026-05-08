import Link from "next/link";

export const metadata = {
  title: "Methodology — MuniReports",
  description: "How MuniReports generates AI-assisted municipal credit research.",
};

export default function MethodologyPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Methodology</h1>
      <p style={{ color: "var(--ink-mute)", fontSize: "1.05rem", marginBottom: "2.5rem" }}>
        How we generate municipal credit research briefs.
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>How it works</h2>
        <p>
          MuniReports generates credit research using a large language model (Anthropic&apos;s Claude) combined with web search
          across public data sources at the time of your request. When you request a report, our system searches for the issuer&apos;s most recent
          Annual Comprehensive Financial Report (ACFR), adopted budget, capital improvement plan, bond disclosures on EMMA, and
          related public records, then synthesizes that information into a structured credit profile.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Data sources</h2>
        <p>Our analysis draws from publicly available data, including:</p>
        <ul>
          <li>Annual Comprehensive Financial Reports (ACFRs) published by issuers</li>
          <li>Adopted budgets and capital improvement plans</li>
          <li>EMMA (Electronic Municipal Market Access) — MSRB&apos;s official bond disclosure system</li>
          <li>State comptroller and auditor data</li>
          <li>U.S. Census Bureau and Bureau of Labor Statistics</li>
          <li>FEMA hazard mitigation data for climate risk indicators</li>
          <li>Issuer official websites and investor relations pages</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>What&apos;s in a report</h2>
        <p>Each report includes:</p>
        <ul>
          <li><strong>Executive summary</strong> with sentiment scoring (Positive / Neutral / Negative)</li>
          <li><strong>Economic overview</strong> — employment, demographics, top employers, MSA growth</li>
          <li><strong>Five-year financial trends</strong> — revenue, expenditures, fund balance</li>
          <li><strong>Revenue and expenditure composition</strong></li>
          <li><strong>Pension &amp; OPEB analysis</strong> — funded ratios, ANPL, contributions</li>
          <li><strong>Bond market data</strong> — outstanding par, coupons, yields, spreads</li>
          <li><strong>Tax burden &amp; housing</strong> — affordability and tax base stability</li>
          <li><strong>Climate &amp; natural hazard risk</strong> — flood, fire, hurricane, heat exposure</li>
          <li><strong>Forward outlook</strong> — five-year forecast with scenario analysis</li>
          <li><strong>Peer comparison</strong> — comparable issuers benchmarked side-by-side</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Sentiment scoring</h2>
        <p>
          Reports include a sentiment score from 0–100 reflecting the AI&apos;s synthesis of financial health, revenue stability,
          debt burden, management track record, and economic fundamentals. Scores above 70 typically reflect Positive sentiment,
          40–70 Neutral, and below 40 Negative. This score is research output, not a credit rating.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Important limitations</h2>
        <p>
          MuniReports is a research and information tool. We are not an NRSRO (Nationally Recognized Statistical Rating
          Organization). Our sentiment scores are not credit ratings and should not be treated as substitutes for ratings issued
          by Moody&apos;s, S&amp;P, Fitch, or KBRA.
        </p>
        <p>
          AI-generated reports may contain errors, omissions, or outdated information. Data may not reflect the most recently
          completed fiscal year if disclosures have not yet been published. Users should verify any data point against primary
          source documents before making investment decisions. Reports are for informational purposes only and do not constitute
          investment, legal, or tax advice.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Updates &amp; freshness</h2>
        <p>
          Each report is generated fresh at the time of request. There is no static database of pre-built reports. This means
          analysis reflects the most current public information available at generation time, but it also means two reports run
          minutes apart may differ slightly as web search results update.
        </p>
      </section>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--accent-bg)", borderRadius: "var(--radius)", borderLeft: "4px solid var(--accent)" }}>
        <p style={{ margin: 0 }}>
          Questions about methodology? Email <a href="mailto:admin@munireports.com">admin@munireports.com</a>.
        </p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/builder" className="btn btn-accent">Generate a report →</Link>
      </div>
    </main>
  );
}
