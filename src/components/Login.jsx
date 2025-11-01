import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (isSignUp) {
        // הרשמה חדשה
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("נרשמת בהצלחה! בדוק את תיבת המייל שלך לאימות החשבון.");
        // אחרי הרשמה, אפשר להפנות למסך התחברות
        setIsSignUp(false);
      } else {
        // התחברות רגילה
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      }
    } catch (e) {
      setErr(e.message || "Login/Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!email) return setErr("Enter your email to reset password.");
    setErr("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      });
      if (error) throw error;
      alert("Password reset email sent. Check your inbox.");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f6e9fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-sm text-zinc-500">
            {isSignUp
              ? "Fill your details to create a new account"
              : "Use your email and password"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 outline-none focus:ring-2 focus:ring-zinc-900"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Password</label>
            <div className="mt-1 relative">
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 pr-12 outline-none focus:ring-2 focus:ring-zinc-900"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500"
                onClick={() => setShowPwd((s) => !s)}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-500">Sign in with Supabase auth</div>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm underline underline-offset-4 hover:text-zinc-800"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
              ? "Sign Up"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
