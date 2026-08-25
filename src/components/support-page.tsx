"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, GoogleLogo, Key, MagnifyingGlass, ShieldCheck, Trash, Warning, X } from "@phosphor-icons/react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  ACTIVE_DELETION_STATUSES,
  categoryLabel,
  deletionRequestFromRow,
  searchSupportArticles,
  statusLabel,
  supportArticles,
  supportCategories,
  supportRequestFromRow,
  type AccountDeletionRequest,
  type SupportArticle,
  type SupportCategory,
  type SupportRequest,
} from "@/lib/support-content";

const categoryExamples: Record<SupportCategory, string> = {
  "getting-started": "First setup, subjects, completed chapters",
  "tasks-study-flow": "Tasks, steps, focus timer, journal loop",
  "syllabus-goals": "Chapter status, goals, difficulty, exclusions",
  calendar: "Dates, tasks, and the in-app study plan",
  resources: "Textbooks, links, uploads",
  "account-privacy": "Sign-in, profile, privacy, deletion",
  "planning-recommendations": "Adaptive plan, preferences, recommendations",
};

type ReauthMethod = "password" | "google";

type AuthProviderKind = "google" | "password";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function remainingDays(value?: string) {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function diagnostics() {
  const userAgent = typeof navigator === "undefined" ? "unknown" : navigator.userAgent;
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Other";
  return { route: typeof window === "undefined" ? "/support" : window.location.pathname, viewport: typeof window === "undefined" ? "unknown" : window.innerWidth < 780 ? "mobile" : "desktop", browser, appVersion: "chaptr-support-v2", timestamp: new Date().toISOString() };
}

function ArticleBody({ article }: { article: SupportArticle }) {
  return <div className="support-article-body">{article.body.map((block, index) => block.type === "paragraph" ? <p key={index}>{block.text}</p> : block.type === "note" ? <aside className="support-note" key={index}><ShieldCheck size={19} weight="fill" /><span>{block.text}</span></aside> : <ol key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ol>)}</div>;
}

function ArticleCard({ article, onOpen }: { article: SupportArticle; onOpen: (article: SupportArticle) => void }) {
  return <button type="button" className="support-article-card" onClick={() => onOpen(article)}><span className="support-card-index">{String(supportArticles.indexOf(article) + 1).padStart(2, "0")}</span><span><small>{categoryLabel(article.category)} · {article.readingMinutes} min read</small><strong>{article.title}</strong><em>{article.summary}</em></span><ArrowRight size={19} /></button>;
}

function FlowHeader({ kicker, title, description, onClose }: { kicker: string; title: string; description: string; onClose: () => void }) {
  return <div className="support-flow-header"><div><small className="support-kicker">{kicker}</small><h3>{title}</h3><p>{description}</p></div><button type="button" className="support-flow-close" onClick={onClose} aria-label="Close this panel"><X size={19} /></button></div>;
}

function RequestForm({ close, onCreated }: { close: () => void; onCreated: (request: SupportRequest) => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const [category, setCategory] = useState<SupportCategory>("tasks-study-flow");
  const [description, setDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [pageContext, setPageContext] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); panelRef.current?.focus(); }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (description.trim().length < 10) return setError("Tell us what happened in at least 10 characters.");
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/support/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, page_context: pageContext.trim() || null, description: description.trim(), expected_behavior: expectedBehavior.trim() || null, include_diagnostics: includeDiagnostics, diagnostics: diagnostics() }) });
      const payload = await response.json().catch(() => null) as { request?: Record<string, unknown>; error?: string } | null;
      if (!response.ok || !payload?.request) throw new Error(payload?.error ?? "Could not send your support request.");
      onCreated(supportRequestFromRow(payload.request as never));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not send your support request."); }
    finally { setSaving(false); }
  };

  return <section ref={panelRef} tabIndex={-1} className="support-flow-card support-request-flow" aria-labelledby="support-request-title"><FlowHeader kicker="CONTACT SUPPORT" title="Tell us what is blocking you" description="Give us the smallest useful description. You can always add more context if we need it." onClose={close} /><form className="support-request-form" onSubmit={submit}><label>Issue type<select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>{supportCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>{categoryExamples[category]}</small></label><label>Page or feature<input maxLength={120} value={pageContext} onChange={(event) => setPageContext(event.target.value)} placeholder="Calendar, Settings, task dialog…" /></label><label className="wide">What happened?<textarea required minLength={10} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="For example: I selected a date in Calendar, but the task did not appear after sync." rows={5} /><small>{description.length}/4000</small></label><label className="wide">What did you expect?<textarea maxLength={2000} value={expectedBehavior} onChange={(event) => setExpectedBehavior(event.target.value)} placeholder="Describe the result you expected." rows={3} /></label><label className="support-checkbox wide"><input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} /><span className="support-checkbox-control" aria-hidden="true"><Check weight="bold" /></span><span className="support-checkbox-copy">Include safe diagnostic details <small>Route, viewport, browser family, app version, and time only.</small></span></label>{error && <p className="support-form-error wide" role="alert">{error}</p>}<div className="support-flow-actions wide"><button type="button" className="support-secondary-button" onClick={close}>Cancel</button><button type="submit" className="support-primary-button" disabled={saving}>{saving ? "Sending…" : "Send request"}<ArrowRight /></button></div></form></section>;
}

function DeletionPanel({ email, current, googleAccount, onClose, onCreated, onCancelled }: { email: string; current?: AccountDeletionRequest; googleAccount: boolean; onClose: () => void; onCreated: (request: AccountDeletionRequest) => void; onCancelled: (request: AccountDeletionRequest) => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const method: ReauthMethod = googleAccount ? "google" : "password";
  const [password, setPassword] = useState("");
  const [reauthenticated, setReauthenticated] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = current && ACTIVE_DELETION_STATUSES.includes(current.status);
  const googleReauthenticationUrl = `/auth/google?next=${encodeURIComponent("/support?accountDeletion=1&deletionVerified=google")}&reauth=deletion`;

  useEffect(() => { panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); panelRef.current?.focus(); }, []);

  useEffect(() => {
    if (!googleAccount || new URLSearchParams(window.location.search).get("deletionVerified") !== "google") return;
    let cancelled = false;
    const completeGoogleVerification = async () => {
      setBusy(true); setError("");
      const verification = await fetch("/api/support/deletion-request", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "google" }) });
      const payload = await verification.json().catch(() => null) as { error?: string } | null;
      if (cancelled) return;
      setBusy(false);
      if (!verification.ok) return setError(payload?.error ?? "Google verification could not be completed. Try again.");
      window.history.replaceState({}, "", "/support");
      setReauthenticated(true);
      setStatusMessage("Google account verified. You can now submit the deletion request.");
    };
    void completeGoogleVerification();
    return () => { cancelled = true; };
  }, [googleAccount]);

  const verifyPassword = async () => {
    if (!password) return setError("Enter your current password to continue.");
    setBusy(true); setError("");
    const verification = await fetch("/api/support/deletion-request", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "password", password }) });
    const payload = await verification.json().catch(() => null) as { error?: string } | null;
    setBusy(false);
    if (!verification.ok) return setError(payload?.error ?? "That password could not be verified.");
    setReauthenticated(true);
    setStatusMessage("Password verified. You can now submit the deletion request.");
  };

  const cancelDeletion = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/support/deletion-request", { method: "DELETE", cache: "no-store" });
      const payload = await response.json().catch(() => null) as { request?: Record<string, unknown>; error?: string } | null;
      if (!response.ok || !payload?.request) throw new Error(payload?.error ?? "Could not cancel the deletion request.");
      onCancelled(deletionRequestFromRow(payload.request as never));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not cancel the deletion request."); }
    finally { setBusy(false); }
  };

  const submitDeletion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reauthenticated) return setError(googleAccount ? "Confirm your Google account before continuing." : "Verify your password before continuing.");
    if (confirmation !== "DELETE MY ACCOUNT") return setError("Type DELETE MY ACCOUNT exactly to continue.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/support/deletion-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(method === "password" ? { confirmation, reauth_method: method, password } : { confirmation, reauth_method: method }) });
      const payload = await response.json().catch(() => null) as { request?: Record<string, unknown>; error?: string; reauthenticationRequired?: boolean } | null;
      if (!response.ok || !payload?.request) {
        if (payload?.reauthenticationRequired) setReauthenticated(false);
        throw new Error(payload?.error ?? "Could not create the deletion request.");
      }
      onCreated(deletionRequestFromRow(payload.request as never));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not create the deletion request."); }
    finally { setBusy(false); }
  };

  return (
    <section ref={panelRef} tabIndex={-1} className="support-flow-card support-delete-flow" aria-labelledby="deletion-title">
      <FlowHeader kicker="ACCOUNT AND PRIVACY" title="Request account deletion" description="This starts a 14-day grace period. Signing in again during that window cancels the request automatically." onClose={onClose} />
      {active ? (
        <div className="support-deletion-existing">
          <CheckCircle size={20} weight="fill" />
          <p>
            <strong>{current.status === "processing" ? "Deletion is being processed" : "Deletion request is active"}</strong>
            <span>{current.referenceCode} · {statusLabel(current.status)}</span>
            {current.status === "processing" ? <small>Cleanup is in progress. This account cannot be restored from this state.</small> : current.scheduledFor ? <small>{remainingDays(current.scheduledFor)} days left · scheduled for {formatDate(current.scheduledFor)}</small> : null}
          </p>
          {current.status !== "processing" && <button type="button" className="support-secondary-button" onClick={() => void cancelDeletion()} disabled={busy}>{busy ? "Cancelling…" : "Cancel deletion request"}</button>}
        </div>
      ) : (
        <>
          <div className="support-warning"><Warning size={19} weight="fill" /><span>This may affect your profile, tasks, chapter progress, journals, resources, planning data, calendar links, and support history. Your request will be reviewed before any destructive action.</span></div>
          <div className="support-delete-identity">
            <span className="support-delete-step">1</span>
            <div>
              <strong>Verify it is really you</strong>
              {googleAccount ? (
                <>
                  <p>This account uses Google sign-in, so Chaptr does not have a password for it. Confirm the same Google account to continue—no verification email is sent.</p>
                  <div className="support-verification-row">
                    {reauthenticated ? <button type="button" className="support-secondary-button" disabled><GoogleLogo size={18} weight="bold" />Google verified</button> : <a className="support-secondary-button" href={googleReauthenticationUrl}><GoogleLogo size={18} weight="bold" />{busy ? "Checking…" : "Continue with Google"}</a>}
                  </div>
                </>
              ) : (
                <>
                  <p>Enter the current Chaptr password for <b>{email}</b>. We will verify it securely and will not send an email code.</p>
                  <div className="support-verification-row">
                    <label className="support-grow">Current password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your current password" disabled={reauthenticated} /></label>
                    <button type="button" className="support-secondary-button" onClick={() => void verifyPassword()} disabled={busy || reauthenticated}><Key size={18} />{reauthenticated ? "Verified" : busy ? "Checking…" : "Verify password"}</button>
                  </div>
                </>
              )}
              {statusMessage && <p className="support-success-message" role="status"><CheckCircle weight="fill" />{statusMessage}</p>}
            </div>
          </div>
          <form className={`support-delete-confirm ${reauthenticated ? "ready" : "locked"}`} onSubmit={submitDeletion}>
            <span className="support-delete-step">2</span>
            <div>
              <strong>Confirm the request</strong>
              <p>{reauthenticated ? "Type the phrase below. This confirms that you understand what you are asking us to review." : "Complete identity verification above to unlock this step."}</p>
              <label>Type <b>DELETE MY ACCOUNT</b><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE MY ACCOUNT" autoComplete="off" disabled={!reauthenticated} /></label>
              {error && <p className="support-form-error" role="alert">{error}</p>}
              <div className="support-flow-actions"><button type="button" className="support-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="support-danger-button" disabled={busy || !reauthenticated}>{busy ? "Submitting…" : "Request deletion"}<Trash /></button></div>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

export function SupportPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(null);
  const [article, setArticle] = useState<SupportArticle | null>(null);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("accountDeletion") === "1");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<AccountDeletionRequest[]>([]);
  const [email, setEmail] = useState("Your signed-in email");
  const [authProvider, setAuthProvider] = useState<AuthProviderKind>("password");
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const client = createSupabaseClient();
        const [{ data: userData }, requestResponse, deletionResponse] = await Promise.all([client?.auth.getUser() ?? Promise.resolve({ data: { user: null } }), fetch("/api/support/requests", { cache: "no-store" }), fetch("/api/support/deletion-request", { cache: "no-store" })]);
        if (cancelled) return;
        if (userData.user?.email) setEmail(userData.user.email);
        const hasGoogleIdentity = Boolean(userData.user?.app_metadata?.provider === "google" || userData.user?.identities?.some((identity) => identity.provider === "google"));
        setAuthProvider(hasGoogleIdentity ? "google" : "password");
        const requestPayload = await requestResponse.json().catch(() => null) as { requests?: Record<string, unknown>[]; error?: string } | null;
        const deletionPayload = await deletionResponse.json().catch(() => null) as { requests?: Record<string, unknown>[]; error?: string } | null;
        if (!requestResponse.ok || !deletionResponse.ok) throw new Error(requestPayload?.error ?? deletionPayload?.error ?? "Support history is unavailable right now.");
        setRequests((requestPayload?.requests ?? []).map((row) => supportRequestFromRow(row as never)));
        setDeletionRequests((deletionPayload?.requests ?? []).map((row) => deletionRequestFromRow(row as never)));
      } catch (error) { if (!cancelled) setLoadError(error instanceof Error ? error.message : "Support history is unavailable right now."); }
      finally { if (!cancelled) setLoadingRequests(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => searchSupportArticles(query).filter((item) => !selectedCategory || item.category === selectedCategory), [query, selectedCategory]);
  const activeDeletion = deletionRequests.find((item) => ACTIVE_DELETION_STATUSES.includes(item.status));
  const googleAccount = authProvider === "google";
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 4200); };
  const openArticle = (next: SupportArticle) => { setArticle(next); setQuery(""); setSelectedCategory(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleRequestCreated = (request: SupportRequest) => { setRequests((current) => [request, ...current]); setRequestFormOpen(false); showNotice(`Request ${request.referenceCode} sent.`); };
  const handleDeletionCreated = (request: AccountDeletionRequest) => { setDeletionRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]); setDeletionOpen(false); showNotice(`Deletion request ${request.referenceCode} recorded for 14 days.`); };
  const handleDeletionCancelled = (request: AccountDeletionRequest) => { setDeletionRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]); setDeletionOpen(false); showNotice("Deletion request cancelled. Your account and data are safe."); };

  return <main id="main-content" tabIndex={-1} className="page support-page"><header className="support-header"><div><small className="support-kicker">NEED A HAND?</small><h2>{article ? <button type="button" className="support-back-link" onClick={() => setArticle(null)}><ArrowLeft />Support</button> : "Support"}</h2><p>{article ? article.summary : "Get a clear next step before you send a request."}</p></div>{!article && <button type="button" className="support-primary-button support-header-cta" onClick={() => { setRequestFormOpen(true); setDeletionOpen(false); }}>Contact support <ArrowRight /></button>}</header>{article ? <section className="support-article-view"><div className="support-article-meta"><span>{categoryLabel(article.category)}</span><span>{article.readingMinutes} min read</span><span>Updated {formatDate(article.updatedAt)}</span></div><h1>{article.title}</h1><ArticleBody article={article} /><div className="support-article-footer"><div><strong>Was this helpful?</strong><span>Your answer helps us improve the next guide.</span></div><div><button type="button" onClick={() => showNotice("Thanks — that helps us improve Support.")}>Yes</button><button type="button" onClick={() => { setArticle(null); setRequestFormOpen(true); }}>Not yet</button></div></div></section> : <>{requestFormOpen && <RequestForm close={() => setRequestFormOpen(false)} onCreated={handleRequestCreated} />}<section className="support-answer-strip"><div><small>START WITH THE QUESTION</small><strong>Search the answer library before opening a support request.</strong></div><label className="support-search"><MagnifyingGlass size={20} /><span className="sr-only">Search help</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, calendar, chapters, account…" /></label>{query && <small className="support-result-count" aria-live="polite">{results.length} result{results.length === 1 ? "" : "s"}</small>}</section><section className="support-overview-grid"><div className="support-section-block"><div className="support-section-heading"><div><small>POPULAR HELP</small><h3>{query ? "Search results" : "Start here"}</h3></div>{query && <button type="button" className="support-text-button" onClick={() => setQuery("")}>Clear search</button>}</div><div className="support-article-list">{results.length ? results.slice(0, query ? 12 : 4).map((item) => <ArticleCard key={item.slug} article={item} onOpen={openArticle} />) : <div className="support-empty"><MagnifyingGlass size={24} /><strong>No article matches that search</strong><span>Try “calendar”, “task”, or “completed chapter”, or contact support with the details.</span><button type="button" className="support-secondary-button" onClick={() => setRequestFormOpen(true)}>Contact support</button></div>}</div></div><aside className="support-request-summary"><div className="support-section-heading"><div><small>YOUR REQUESTS</small><h3>Recent support</h3></div><span className="support-count-badge">{requests.length}</span></div>{loadingRequests ? <p className="support-muted">Loading your requests…</p> : requests.length ? <div className="support-request-list">{requests.slice(0, 4).map((request) => <div className="support-request-row" key={request.id}><span><strong>{request.referenceCode}</strong><small>{categoryLabel(request.category)} · {formatDate(request.createdAt)}</small></span><em className={`support-status status-${request.status}`}>{statusLabel(request.status)}</em></div>)}</div> : <p className="support-muted">No requests yet. Search the help library first, then contact us if you still need a hand.</p>}{loadError && <p className="support-form-error" role="alert">{loadError}</p>}<button type="button" className="support-secondary-button support-full-button" onClick={() => setRequestFormOpen(true)}>Contact support <ArrowRight /></button></aside></section><section className="support-category-section"><div className="support-section-heading"><div><small>BROWSE BY CATEGORY</small><h3>Choose the area that feels stuck</h3></div>{selectedCategory && <button type="button" className="support-text-button" onClick={() => setSelectedCategory(null)}>Show all</button>}</div><div className="support-category-grid">{supportCategories.map((category) => <button type="button" key={category.id} className={`support-category-card ${selectedCategory === category.id ? "active" : ""}`} onClick={() => { setSelectedCategory(selectedCategory === category.id ? null : category.id); setQuery(""); }}><span><strong>{category.label}</strong><small>{categoryExamples[category.id]}</small></span><ArrowRight size={18} /></button>)}</div></section><section className="support-privacy-row"><div><span className="support-privacy-icon"><ShieldCheck size={20} weight="fill" /></span><div><small>ACCOUNT AND PRIVACY</small><h3>Your data stays yours</h3><p>Support requests are private to your account. A verified deletion request starts a 14-day grace period and is cancelled automatically if you sign in again during it.</p></div></div><button type="button" className="support-danger-outline" onClick={() => { setDeletionOpen(true); setRequestFormOpen(false); }}> <Trash />{activeDeletion ? "View deletion request" : "Request account deletion"}</button></section>{deletionOpen && <DeletionPanel email={email} current={activeDeletion} googleAccount={googleAccount} onClose={() => setDeletionOpen(false)} onCreated={handleDeletionCreated} onCancelled={handleDeletionCancelled} />}</>}{notice && <p className="support-toast" role="status"><CheckCircle weight="fill" />{notice}</p>}</main>;
}
