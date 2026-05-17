export const metadata = {
  title: "Methodology — MuniReports",
  description: "How MuniReports researches and produces municipal credit briefs.",
};

export default function MethodologyPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Methodology</h1>
      <p style={{ color: "var(--text2)", fontSize: "1.05rem", marginBottom: "2.5rem" }}>
        How we research and produce municipal credit briefs.
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>How it works</h2>
        <p>
          Each MuniReports brief is produced through a structured analyst workflow. We begin with dossier compilation — assembling the issuer&apos;s most recent Annual Comprehensive Financial Report (ACFR), adopted budget, capital improvement plan, EMMA bond disclosures, and related public records. From there, our analysts review the source documents, apply the relevant published rating-agency methodology, draft the brief, and route it through internal review before delivery.
        </p>
        <p>
          For cities and counties we apply the Moody&apos;s US Cities and Counties Rating Methodology (July 24, 2024); for K-12 school districts we apply the Moody&apos;s US K-12 Public School Districts Rating Methodology (July 24, 2024). Every scorecard sub-factor in a brief shows its inputs and the bucket assignment derived from those inputs.
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
        <h2>What&apos;s in a brief</h2>
        <p>Each brief includes:</p>
        <ul>
          <li><strong>Executive summary</strong> — key findings and credit narrative</li>
          <li><strong>Economic overview</strong> — employment, demographics, top employers, MSA growth</li>
          <li><strong>Five-year financial trends</strong> — revenue, expenditures, fund balance</li>
          <li><strong>Revenue and expenditure composition</strong></li>
          <li><strong>Pension &amp; OPEB analysis</strong> — funded ratios, ANPL, contributions</li>
          <li><strong>Moody&apos;s scorecard application</strong> — eight sub-factors with measured inputs and bucket assignments</li>
          <li><strong>Bond market data</strong> — outstanding par, coupons, yields, spreads</li>
          <li><strong>Tax burden &amp; housing</strong> — affordability and tax base stability</li>
          <li><strong>Climate &amp; natural hazard risk</strong> — flood, fire, hurricane, heat exposure</li>
          <li><strong>Capital plan and forward outlook</strong> — multi-year financial forecast and CIP context</li>
          <li><strong>Sources and references</strong> — every figure tied to its primary source</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Important limitations</h2>
        <p>
          MuniReports is not an NRSRO (Nationally Recognized Statistical Rating Organization). Our briefs are research output, not credit ratings, and should not be treated as substitutes for ratings issued by Moody&apos;s, S&amp;P, Fitch, or KBRA.
        </p>
        <p>
          Our analysts review and verify all content before delivery. Briefs reflect the most recent ACFR and EMMA disclosures available at the time of delivery; subsequent disclosures or material events after delivery are not retroactively incorporated. Briefs are for informational purposes only and do not constitute investment, legal, or tax advice. Users should verify any data point against primary source documents before making investment decisions.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Updates &amp; freshness</h2>
        <p>
          Briefs reflect the most recent ACFR and EMMA disclosures available at delivery. We do not maintain a static catalog of pre-built briefs; each is researched at the time of order against the most current public information.
        </p>
      </section>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--accent-bg)", borderRadius: "var(--radius)", borderLeft: "4px solid var(--accent)" }}>
        <p style={{ margin: 0 }}>
          Questions about methodology? Email <a href="mailto:admin@munireports.com">admin@munireports.com</a>.
        </p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <a href="/sample-austin.pdf" className="btn btn-accent">See methodology in action — download the Austin sample brief →</a>
      </div>
    </main>
  );
}
