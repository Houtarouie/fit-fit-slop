import React, { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0]
            }
          }
        });
        
        if (error) throw error;
        
        setSuccessMsg("Registration successful! Please check your email inbox to verify your account, then log in.");
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
      }
    } catch (err) {
      console.error(err);
      let msg = "Authentication failed. Please verify your details.";
      if (err) {
        if (typeof err === "object") {
          msg = err.message || err.error_description || err.msg || JSON.stringify(err);
          if (msg === "{}" || !msg) {
            msg = err.toString() || "Unknown error";
          }
        } else {
          msg = String(err);
        }
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-center justify-between" style={{ minHeight: "80vh", justifyContent: "center", padding: "1rem" }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: "420px", padding: "2.2rem" }}>
        
        <div style={{ textAlignment: "center", marginBottom: "2rem" }}>
          <div className="brand" style={{ justifyContent: "center", marginBottom: "1rem" }}>
            <div className="brand-icon" style={{ width: "42px", height: "42px", fontSize: "1.4rem" }}>⚡</div>
            <h1 style={{ fontSize: "1.7rem" }}>Nutri<span>Track</span></h1>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {isSignUp ? "Create a free profile to start tracking" : "Sign in to track calories, protein, and sync with friends"}
          </p>
        </div>

        {errorMsg && (
          <div className="api-alert" style={{ background: "rgba(244, 63, 94, 0.08)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
            <span className="api-alert-icon" style={{ color: "var(--danger)" }}>⚠️</span>
            <p style={{ color: "var(--text-primary)" }}>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="api-alert" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <span className="api-alert-icon" style={{ color: "var(--success)" }}>✓</span>
            <p style={{ color: "var(--text-primary)" }}>{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isSignUp && (
            <div className="form-group">
              <label>Your Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Fit"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength="6"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-100 mt-1" disabled={loading}>
            {loading ? (isSignUp ? "Signing Up..." : "Signing In...") : (isSignUp ? "Register Account ➕" : "Sign In 🔒")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            {isSignUp ? "Already have an account? " : "New to NutriTrack? "}
          </span>
          <button
            type="button"
            style={{ background: "transparent", border: "none", color: "var(--accent-calories-start)", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(""); setSuccessMsg(""); }}
          >
            {isSignUp ? "Login Here" : "Register Here"}
          </button>
        </div>

      </div>
    </div>
  );
}
