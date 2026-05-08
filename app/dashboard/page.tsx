import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's profile (plan info)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  // Get user's saved reports
  const { data: reports } = await supabase
    .from("reports")
    .select("id, issuer_name, state, issuer_type, rating, sentiment, sentiment_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const plan = profile?.plan || "free";

  return (
    <div className="container" style={{ padding: "2.5rem 1.5rem 4rem" }}>
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My Reports</h1>
          <div className="dash-sub">
            {user.email} · Plan: <strong style={{ textTransform: "capitalize" }}>{plan}</strong>
            {plan === "free" && (
              <span> · <Link href="/pricing" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Upgrade to Pro to save reports permanently →</Link></span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <Link href="/builder" className="btn btn-accent">+ New Report</Link>
        </div>
      </div>

      {!reports || reports.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem",
          background: "var(--bg2)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--line)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📊</div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: ".5rem" }}>No reports yet</h3>
          <p style={{ color: "var(--text2)", marginBottom: "1.5rem" }}>
            Generate your first research brief — search any issuer.
          </p>
          <Link href="/builder" className="btn btn-accent">Go to Report Builder →</Link>
        </div>
      ) : (
        <div className="report-grid">
          {reports.map((r: any) => (
            <Link href={`/report/${r.id}`} key={r.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="report-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3>{r.issuer_name}</h3>
                  <span className={`sent-pill ${r.sentiment === "Positive" ? "pos" : r.sentiment === "Negative" ? "neg" : "neu"}`}>
                    {r.sentiment}
                  </span>
                </div>
                <div className="meta">
                  {r.issuer_type} · {r.state} · {r.rating || "NR"} · Score: {r.sentiment_score}
                </div>
                <p>
                  Generated {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
