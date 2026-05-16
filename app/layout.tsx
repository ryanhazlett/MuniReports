import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "MuniReports — Municipal Credit Briefs & Ratings Advisory",
  description: "Research-grade credit briefs and ratings advisory for U.S. municipal issuers.",
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
              <span>Muni<em>Reports</em></span>
            </Link>
            <div className="nav-links">
              <a href="/sample-austin.pdf">Sample brief</a>
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
                <a href="mailto:admin@munireports.com" className="btn btn-accent btn-sm">Contact us</a>
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
                <span>Muni<em>Reports</em></span>
              </div>
              <p style={{ color: "var(--text2)", fontSize: "0.88rem", lineHeight: 1.55, maxWidth: "36ch", marginTop: "0.7rem" }}>
                AI-assisted municipal credit research. Search any issuer to generate a research brief from public financial data.
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
