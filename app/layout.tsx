import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "MuniReports — Municipal Bond Credit Reports",
  description: "Free AI-powered credit reports for municipal bonds. Search any issuer, upload documents, generate analysis in minutes.",
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
                Free AI-powered credit reports for municipal bonds. Upload documents or search any issuer.
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
              <a>Help Center</a>
              <a>Methodology</a>
              <a>Status</a>
            </div>
            <div>
              <h6>Company</h6>
              <a>About</a>
              <a>Contact</a>
              <a>Security</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 MuniReports</span>
            <span>Not a credit rating agency. AI sentiment is research, not an NRSRO rating.</span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
