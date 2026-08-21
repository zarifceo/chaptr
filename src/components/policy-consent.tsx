"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, LockKey, SignOut, X } from "@phosphor-icons/react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { POLICY_PUBLISHED_DATE, POLICY_ROUTES, POLICY_VERSIONS, safeNextPath } from "@/lib/policy-config";

export function PolicyConsent() {
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") return "/home";
    return safeNextPath(new URLSearchParams(window.location.search).get("next"));
  });

  const accept = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!terms || !privacy) {
      setError("Read and accept both policies before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/policies/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms, privacy }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Could not record your policy acceptance.");
      router.replace(nextPath);
      router.refresh();
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Could not record your policy acceptance.");
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    await createSupabaseClient()?.auth.signOut().catch(() => undefined);
    router.replace("/auth");
  };

  return (
    <main className="policy-consent-page">
      <section className="policy-consent-card" aria-labelledby="policy-consent-title">
        <div className="policy-consent-brand"><div className="auth-mark"><Image src="/chaptr-logo.png" width={56} height={56} alt="Chaptr" /></div><span>CHAPTR · ACCOUNT ACCESS</span></div>
        <div className="policy-consent-heading"><small>POLICY UPDATE</small><h1 id="policy-consent-title">Please review the current policies</h1><p>To continue to your study workspace, read and accept both policies below. Your acceptance is recorded with the policy versions and time.</p></div>
        <div className="policy-consent-version"><LockKey size={18} weight="fill" /><span>Current version published {POLICY_PUBLISHED_DATE}<small>Terms {POLICY_VERSIONS.terms} · Privacy {POLICY_VERSIONS.privacy}</small></span></div>
        <form onSubmit={accept} className="policy-consent-form">
          <label className="policy-consent-check"><input type="checkbox" checked={terms} onChange={(event) => { setTerms(event.target.checked); setError(""); }} /><span><strong>I have read and accept the <Link href={POLICY_ROUTES.terms} target="_blank">Terms of Service</Link>.</strong><small>These terms explain account use, study content, recommendations, resources, deletion, and service limits.</small></span></label>
          <label className="policy-consent-check"><input type="checkbox" checked={privacy} onChange={(event) => { setPrivacy(event.target.checked); setError(""); }} /><span><strong>I have read and accept the <Link href={POLICY_ROUTES.privacy} target="_blank">Privacy Policy</Link>.</strong><small>This explains the account, study, resource, support, authentication, and deletion information Chaptr handles.</small></span></label>
          {error && <p className="policy-consent-error" role="alert"><X size={18} />{error}</p>}
          <button className="solid-cta policy-consent-submit" type="submit" disabled={busy}>{busy ? "Saving acceptance…" : "Accept and continue"}<ArrowRight /></button>
        </form>
        <div className="policy-consent-footer"><span><CheckCircle weight="fill" />Your workspace remains private to your account.</span><button type="button" onClick={() => void signOut()} disabled={busy}><SignOut />Sign out</button></div>
      </section>
    </main>
  );
}
