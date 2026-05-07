import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "MuniReports — AI-Assisted Municipal Credit Research & Bond Analysis",
  description: "Free AI-powered credit reports for municipal bonds. Search any issuer, AI compiles research from public sources in minutes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <nav className="top">
          <div className="nav-in">
            <Link href="/" className="brand">
              <div className="brand-dot">MR</div>
              Muni<em>Reports</em>
            </Link>
            <div className="nav-links">
              <Link href="/">Product</Link>
              <Link href="/builder">Report Builder</Link>
              {user && <Link href="/dashboard">My Reports</Link>}
              <Link href="/pricing">Free + Pro</Link>
            </div>
            <div className="nav-cta">
              {user ? (
                <>
                  <Link href="/dashboard" className="btn btn-ghost btn-sm">
                    My Reports
                  </Link>
                  <form action="/api/auth/signout" method="POST">
                    <button type="submit" className="btn btn-out btn-sm">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                  <Link href="/builder" className="btn btn-accent btn-sm">
                    Start analyzing — free →
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main>{children}</main>

        <footer>
          <div className="footer-grid">
            <div>
              <div className="brand" style={{ marginBottom: "0.5rem" }}>
                <div className="brand-dot">MR</div>
                Muni<em>Reports</em>
              </div>
              <p style={{ color: "var(--text2)", fontSize: "0.88rem", lineHeight: 1.55, maxWidth: "36ch", marginTop: "0.7rem" }}>
                Free AI-powered credit reports for municipal bonds. Search any issuer to generate research from public sources.
              </p>
            </div>
            <div>
              <h6>Product</h6>
              <Link href="/">Overview</Link>
              <Link href="/builder">Report Builder</Link>
              <Link href="/pricing">Free + Pro</Link>
            </div>
            <div>
              <h6>Resources</h6>
              <Link href="/methodology">Methodology</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/status">Status</Link>
            </div>
            <div>
              <h6>Company</h6>
              <Link href="/about">About</Link>
              <a href="mailto:admin@munireports.com">Contact</a>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 MuniReports</span>
            <span>Not a credit rating agency. AI sentiment is research, not an NRSRO rating.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
