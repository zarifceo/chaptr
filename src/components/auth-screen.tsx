"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, EnvelopeSimple, LockKey, SignIn, UserPlus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "forgot" | "reset";

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return "That email or password is not correct.";
  if (/user already registered/i.test(message)) return "An account already exists for this email. Try signing in instead.";
  if (/password should be at least/i.test(message)) return "Use a password with at least six characters.";
  return message;
}

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(() => typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("auth") === "reset" || window.location.pathname === "/auth/reset-password") ? "reset" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") === "callback" ? "The sign-in link could not be completed. Please try again." : "");

  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setMessage("");
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const signInWithGoogle = async () => {
    const client = createSupabaseClient();
    if (!client) return setError("Supabase is not configured for this deployment.");
    setBusy(true);
    const { error: authError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/`, scopes: "openid email profile" },
    });
    if (authError) { setError(friendlyError(authError.message)); setBusy(false); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const client = createSupabaseClient();
    if (!client) return setError("Supabase is not configured for this deployment.");
    if ((mode === "sign-up" || mode === "reset") && password !== confirmPassword) return setError("The passwords do not match.");
    setBusy(true);

    if (mode === "sign-in") {
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) { setError(friendlyError(result.error.message)); setBusy(false); return; }
      router.push("/");
      return;
    }
    if (mode === "sign-up") {
      const result = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` } });
      if (result.error) { setError(friendlyError(result.error.message)); setBusy(false); return; }
      setMessage(result.data.session ? "Your account is ready. Loading your workspace…" : "Check your email to verify your account, then return here to sign in.");
      setBusy(false);
      if (result.data.session) router.push("/");
      return;
    }
    if (mode === "forgot") {
      const result = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` });
      if (result.error) setError(friendlyError(result.error.message));
      else setMessage("If an account exists for that email, a password reset link is on its way.");
      setBusy(false);
      return;
    }
    const result = await client.auth.updateUser({ password });
    if (result.error) setError(friendlyError(result.error.message));
    else { setMessage("Password updated. Returning to your workspace…"); window.setTimeout(() => router.push("/"), 700); }
    setBusy(false);
  };

  const title = mode === "sign-up" ? "Create your study workspace" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Welcome back";
  const subtitle = mode === "sign-up" ? "Set up a private SSC workspace for your own study plan." : mode === "forgot" ? "We’ll send a secure reset link if this email has an account." : mode === "reset" ? "Use a password you will remember and do not reuse elsewhere." : "Sign in to continue your study plan.";

  return <main className="auth-screen"><section className="auth-brand"><div className="auth-mark">SSC</div><p className="eyebrow">SSC 2027 · PRIVATE STUDY WORKSPACE</p><h1>Turn the syllabus into a plan you can follow.</h1><p>Track chapters, focused sessions, mistakes, evidence, and deadlines in one private workspace.</p><div className="auth-points"><span><CheckCircle weight="fill" />Your data stays in your account.</span><span><CheckCircle weight="fill" />Start with a guided setup.</span><span><CheckCircle weight="fill" />Change the plan as you learn.</span></div></section><section className="auth-card panel"><div className="auth-card-heading"><div><small className="eyebrow">{mode === "sign-up" ? "NEW ACCOUNT" : "YOUR WORKSPACE"}</small><h2>{title}</h2><p>{subtitle}</p></div><LockKey size={25} /></div>{mode !== "forgot" && mode !== "reset" && <Button type="button" variant="outline" className="auth-google" onClick={signInWithGoogle} disabled={busy}><span className="google-dot">G</span>{busy ? "Opening Google…" : "Continue with Google"}</Button>}{mode !== "forgot" && mode !== "reset" && <div className="auth-divider"><span>or use email</span></div>}<form onSubmit={submit} className="auth-form">{mode !== "reset" && <label><span>Email address</span><div className="auth-input"><EnvelopeSimple /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>}{mode !== "forgot" && <label><span>{mode === "reset" ? "New password" : "Password"}</span><div className="auth-input"><LockKey /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={6} required /></div></label>}{(mode === "sign-up" || mode === "reset") && <label><span>Confirm password</span><div className="auth-input"><LockKey /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat the password" autoComplete="new-password" minLength={6} required /></div></label>}{error && <p className="auth-error" role="alert"><X />{error}</p>}{message && <p className="auth-message" role="status"><CheckCircle />{message}</p>}<Button className="solid-cta auth-submit" size="lg" disabled={busy}>{mode === "sign-in" ? <SignIn /> : mode === "sign-up" ? <UserPlus /> : mode === "forgot" ? <ArrowRight /> : <CheckCircle />}{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}</Button></form><div className="auth-links">{mode === "sign-in" && <><button type="button" onClick={() => changeMode("forgot")}>Forgot password?</button><button type="button" onClick={() => changeMode("sign-up")}>Create a new account</button></>}{mode === "sign-up" && <button type="button" onClick={() => changeMode("sign-in")}>Already have an account? Sign in</button>}{mode === "forgot" && <button type="button" onClick={() => changeMode("sign-in")}>Back to sign in</button>}{mode === "reset" && <button type="button" onClick={() => changeMode("sign-in")}>Cancel</button>}</div></section></main>;
}
