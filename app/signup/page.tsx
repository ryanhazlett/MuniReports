"use client";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSuccess(true); setLoading(false); }
  };

  if (success) {
    return (
      <div className="auth-container" style={{ textAlign: "center" }}>
        <h1>Check your email</h1>
        <p className="subtitle">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
        <Link href="/builder" className="btn btn-out" style={{ marginTop: "1rem" }}>
          Continue analyzing for free →
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h1>Create your account</h1>
      <p className="subtitle">Save reports, build watchlists, and collaborate. The analysis is always free.</p>
      <form onSubmit={handleSignup}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn btn-accent" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }} disabled={loading}>
          {loading ? "Creating account..." : "Create free account"}
        </button>
      </form>
      <div className="auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
