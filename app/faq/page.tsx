import Link from "next/link";

export const metadata = {
  title: "FAQ — MuniReports",
  description: "Frequently asked questions about MuniReports.",
};

const faqs = [
  {
    q: "What is MuniReports?",
    a: "MuniReports is an AI-assisted research tool that compiles public financial disclosures into structured credit research briefs for U.S. municipal issuers — cities, counties, school districts, utilities, and special districts. Briefs generate in under two minutes.",
  },
  {
    q: "Who is this for?",
    a: "Bond investors, community banks, hedge funds, asset managers, financial advisors, and journalists who need fast, structured research on municipal issuers as a starting point for due diligence.",
  },
  {
    q: "Is this a credit rating?",
    a: "No. MuniReports is not an NRSRO. Our sentiment scores are research output — useful as a starting point for due diligence, but not a substitute for ratings from Moody's, S&P, Fitch, or KBRA.",
  },
  {
    q: "How accurate is the AI?",
    a: "Reports are generated using web search of public financial documents at the time of your request. Accuracy depends on the quality and recency of available disclosures. We recommend verifying any specific data point against the primary source (the issuer's ACFR or budget) before making investment decisions.",
  },
  {
    q: "How much does a report cost?",
    a: "Your first report is free, no account required. After that, single reports are $4.99 each, or $19.99 for a 5-pack ($4 each). Unlimited usage is available — contact admin@munireports.com.",
  },
  {
    q: "Can I download a report as a PDF?",
    a: "Yes. Every report has a Print / PDF button that produces a clean, branded PDF. We recommend unchecking 'Headers and footers' in your browser's print dialog for the cleanest output.",
  },
  {
    q: "What if a report has missing or wrong information?",
    a: "AI generation can occasionally fail to populate certain sections, especially when issuers haven't published recent disclosures. If you spot an error, email us at admin@munireports.com. We're actively improving accuracy.",
  },
  {
    q: "Do you cover non-U.S. issuers?",
    a: "Currently U.S. only — cities, counties, school districts, utilities, and special districts.",
  },
  {
    q: "How fresh is the data?",
    a: "Reports are generated on-demand from web search at the time of your request. Data reflects whatever the issuer has most recently published publicly. If the latest fiscal year's ACFR hasn't been released yet, the report will use the most recent available year.",
  },
  {
    q: "Can I save reports to my account?",
    a: "Yes. When you create an account, your generated reports are saved to your dashboard so you can revisit them anytime.",
  },
  {
    q: "Do you offer refunds?",
    a: "If a report fails to generate or is materially broken, email admin@munireports.com and we'll credit you. See our Terms of Service for full details.",
  },
];

export default function FaqPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Frequently Asked Questions</h1>
      <p style={{ color: "var(--ink-mute)", fontSize: "1.05rem", marginBottom: "3rem" }}>
        Quick answers to common questions about MuniReports.
      </p>

      {faqs.map((item, i) => (
        <div key={i} style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>{item.q}</h3>
          <p style={{ color: "var(--ink-mute)", lineHeight: 1.6, margin: 0 }}>{item.a}</p>
        </div>
      ))}

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "var(--accent-bg)", borderRadius: "var(--radius)", borderLeft: "4px solid var(--accent)" }}>
        <p style={{ margin: 0 }}>
          Still have questions? Email <a href="mailto:admin@munireports.com">admin@munireports.com</a>.
        </p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/builder" className="btn btn-accent">Try it →</Link>
      </div>
    </main>
  );
}
