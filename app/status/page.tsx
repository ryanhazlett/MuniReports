import Link from "next/link";

export const metadata = {
  title: "Status — MuniReports",
  description: "MuniReports system status.",
};

const services = [
  { name: "Website", status: "operational" },
  { name: "Issuer Search", status: "operational" },
  { name: "Report Generation", status: "operational" },
  { name: "Payments", status: "operational" },
  { name: "User Accounts", status: "operational" },
];

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === "operational");

  return (
    <main style={{ maxWidth: "780px", margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>System Status</h1>
      <p style={{ color: "var(--ink-mute)", fontSize: "1.05rem", marginBottom: "3rem" }}>
        Live status of MuniReports services.
      </p>

      <div
        style={{
          padding: "1.5rem 2rem",
          background: allOperational ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)",
          border: `1px solid ${allOperational ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
          borderRadius: "var(--radius)",
          marginBottom: "2.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: allOperational ? "#22c55e" : "#eab308",
          }}
        />
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
          {allOperational ? "All systems operational" : "Some systems experiencing issues"}
        </h2>
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {services.map((svc, i) => (
          <div
            key={svc.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
            }}
          >
            <span>{svc.name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "#22c55e" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Operational
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2.5rem", padding: "1.5rem", background: "var(--accent-bg)", borderRadius: "var(--radius)", borderLeft: "4px solid var(--accent)" }}>
        <p style={{ margin: 0 }}>
          Experiencing an issue not reflected here? Email{" "}
          <a href="mailto:admin@munireports.com">admin@munireports.com</a>.
        </p>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/" className="btn btn-out">← Back to home</Link>
      </div>
    </main>
  );
}
