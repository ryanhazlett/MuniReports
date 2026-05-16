import Link from "next/link";

export const metadata = {
  title: "Order received — MuniReports",
};

export default function ThanksPage() {
  return (
    <section style={{ padding: "5.5rem 0 5rem" }}>
      <div className="container">
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: ".45rem",
            background: "var(--accent-bg)", color: "var(--accent)",
            border: "1px solid var(--accent-line)", fontSize: ".78rem",
            fontWeight: 600, padding: ".38rem .85rem", borderRadius: 100,
            marginBottom: "1.6rem"
          }}>
            <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: "50%" }} />
            Payment received
          </div>
          <h1 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, marginBottom: "1.3rem" }}>
            Order received.
          </h1>
          <p style={{ fontSize: "1.05rem", color: "var(--text2)", lineHeight: 1.7, marginBottom: "1rem" }}>
            Thanks for your order. We&apos;ve received your request for a credit brief and will deliver the PDF to the email address you provided at checkout within 5 business days.
          </p>
          <p style={{ fontSize: "1.05rem", color: "var(--text2)", lineHeight: 1.7, marginBottom: "2rem" }}>
            If you need to add scope details or have questions, reply to your Stripe receipt or email <a href="mailto:admin@munireports.com" style={{ color: "var(--accent)" }}>admin@munireports.com</a> directly. We&apos;ll respond within one business day.
          </p>
          <Link href="/" className="btn btn-out">Return to home</Link>
        </div>
      </div>
    </section>
  );
}
