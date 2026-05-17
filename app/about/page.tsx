import Link from "next/link";

export const metadata = {
  title: "About — MuniReports",
  description: "About MuniReports — research-grade credit briefs and ratings advisory for U.S. municipal issuers.",
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>About MuniReports</h1>
      <p style={{ color: "var(--text2)", fontSize: "1.05rem", marginBottom: "2.5rem" }}>
        MuniReports produces research-grade credit briefs and provides ratings advisory for U.S. municipal issuers. We were founded on the conviction that municipal credit research has a quality problem — academic analyses that ignore operational pressures, or quick-turn ratings memos that miss the methodology under the hood.
      </p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Built by analysts who&apos;ve sat on both sides.</h2>
        <p>
          MuniReports was founded by a former Moody&apos;s Investors Service public finance analyst and a 10-year veteran of Wells Fargo&apos;s Government Banking practice. Our approach combines rating-agency methodology with the practical experience of advising public-sector finance teams through real rating cycles, debt issuances, and credit transitions.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>What we do.</h2>

        <h3>Credit briefs.</h3>
        <p>
          Polished, methodology-driven credit briefs on any U.S. municipal issuer. We apply the published Moody&apos;s US Cities &amp; Counties and US K-12 Public School Districts methodologies to ACFR and EMMA data. Every figure sourced. Every scorecard sub-factor shows its inputs. Delivered within 5 business days. $199 per brief.
        </p>

        <h3>Ratings preparation.</h3>
        <p>
          For issuer finance teams preparing for a Moody&apos;s, S&amp;P, or Fitch rating cycle. We work with you 60–120 days ahead of the call — building the credit story, anticipating analyst questions, and coaching the prep. Engagements are scoped after a conversation.
        </p>

        <h3>Advisory.</h3>
        <p>
          Ongoing credit advisory, investor relations support, and credit narrative work for issuers navigating refinancing, refunding, or credit transitions.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2>Not a credit rating agency.</h2>
        <p>
          MuniReports is not a Nationally Recognized Statistical Rating Organization (NRSRO). Our briefs are research output, not credit ratings, and should not be used as substitutes for ratings issued by Moody&apos;s Investors Service, S&amp;P Global Ratings, Fitch Ratings, KBRA, or other registered rating agencies. See <Link href="/terms">Terms</Link> for full disclosures.
        </p>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <p>
          Contact us at <a href="mailto:admin@munireports.com">admin@munireports.com</a> to discuss a brief or scope a consulting engagement.
        </p>
      </section>
    </main>
  );
}
