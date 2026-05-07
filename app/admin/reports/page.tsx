import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type CachedReport = {
  issuer_key: string;
  issuer_name: string | null;
  state: string | null;
  generated_at: string;
  refresh_count: number | null;
};

export default async function AdminReportsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) {
    notFound();
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: rows } = await admin
    .from("cached_reports")
    .select("issuer_key, issuer_name, state, generated_at, refresh_count")
    .order("generated_at", { ascending: false });

  const reports = (rows as CachedReport[] | null) ?? [];

  const thStyle = {
    textAlign: "left" as const,
    padding: ".7rem 1rem",
    fontFamily: "var(--mono)",
    fontSize: ".72rem",
    color: "var(--text3)",
    textTransform: "uppercase" as const,
    letterSpacing: ".06em",
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.5rem 4rem" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: ".4rem" }}>Admin · Cached Reports</h1>
      <div style={{ fontSize: ".88rem", color: "var(--text2)", marginBottom: "1.5rem" }}>
        {reports.length} cached report{reports.length === 1 ? "" : "s"}
      </div>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th style={thStyle}>Issuer</th>
            <th style={thStyle}>State</th>
            <th style={thStyle}>Generated</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Refreshes</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.issuer_key} style={{ borderBottom: "1px solid var(--line-soft)" }}>
              <td style={{ padding: ".7rem 1rem", fontWeight: 500 }}>{r.issuer_name || r.issuer_key}</td>
              <td style={{ padding: ".7rem 1rem", color: "var(--text2)" }}>{r.state || "—"}</td>
              <td style={{ padding: ".7rem 1rem", fontFamily: "var(--mono)", fontSize: ".82rem", color: "var(--text2)" }}>
                {new Date(r.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </td>
              <td style={{ padding: ".7rem 1rem", textAlign: "right", fontFamily: "var(--mono)" }}>{r.refresh_count ?? 0}</td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text3)" }}>No cached reports yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
