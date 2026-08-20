"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Books, CheckCircle, Exam, LinkSimple, Pause, Play, Plus, Timer, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { chapters as seedChapters, subjects, orderChapters } from "@/lib/academic-data";
import type { Chapter, ChapterEvidence, CuratedTextbook, JournalEntry, Mistake, ResourceKind, StudyResource, StudySession, StudyTask } from "@/lib/types";

const bySubject = (id: string) => subjects.find((subject) => subject.id === id)!;
const byChapter = (id: string, list = seedChapters) => list.find((chapter) => chapter.id === id)!;
const resourceKinds: ResourceKind[] = ["textbook", "question-bank", "video", "notes", "website", "other"];
const resourceKindLabel: Record<ResourceKind, string> = { textbook: "Textbook", "question-bank": "Question bank", video: "Video", notes: "Notes", website: "Website", other: "Other" };

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function evidenceLevel(item: Omit<ChapterEvidence, "evidenceLevel">): ChapterEvidence["evidenceLevel"] {
  if (!item.sessions && !item.journalEntries && !item.resources) return "none";
  if (item.accuracy >= 80 && item.sessions >= 2 && item.resolvedMistakes >= item.openMistakes) return "exam-ready";
  if (item.sessions || item.journalEntries || item.resources) return item.focusedMinutes >= 90 || item.attempted >= 10 ? "working" : "light";
  return "none";
}

export type StudyEvidenceRecord = {
  key: string;
  subjectId: string;
  chapterId: string;
  happenedAt: string;
  focusedSeconds: number;
  pauseSeconds: number;
  attempted: number;
  correct: number;
};

function liveFocusedSeconds(session: StudySession, now: number) {
  const runningSeconds = session.timerState === "running" && session.lastResumedAt ? Math.max(0, Math.floor((now - new Date(session.lastResumedAt).getTime()) / 1000)) : 0;
  return session.focusedSeconds + runningSeconds;
}

function evidenceDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function summarizeStudyEvidence(sessions: StudySession[], entries: JournalEntry[], now = Date.now()): StudyEvidenceRecord[] {
  const buckets = new Map<string, { sessions: StudySession[]; entries: JournalEntry[] }>();
  sessions.forEach((session) => {
    const key = session.taskId ? `task:${session.taskId}` : `session:${session.id}`;
    const bucket = buckets.get(key) ?? { sessions: [], entries: [] };
    bucket.sessions.push(session);
    buckets.set(key, bucket);
  });
  entries.forEach((entry) => {
    const key = entry.taskId ? `task:${entry.taskId}` : `journal:${entry.id}`;
    const bucket = buckets.get(key) ?? { sessions: [], entries: [] };
    bucket.entries.push(entry);
    buckets.set(key, bucket);
  });
  return [...buckets.entries()].map(([key, bucket]) => {
    const first = bucket.sessions[0];
    const latestEntry = [...bucket.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const latestSession = [...bucket.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const sessionAttempts = bucket.sessions.reduce((sum, session) => sum + (session.questionsAttempted ?? 0), 0);
    const sessionCorrect = bucket.sessions.reduce((sum, session) => sum + (session.questionsCorrect ?? 0), 0);
    const journalAttempts = bucket.entries.reduce((sum, entry) => sum + entry.attempted, 0);
    const journalCorrect = bucket.entries.reduce((sum, entry) => sum + entry.correct, 0);
    const sessionSeconds = bucket.sessions.reduce((sum, session) => sum + liveFocusedSeconds(session, now), 0);
    const journalSeconds = bucket.entries.reduce((sum, entry) => sum + entry.minutes * 60, 0);
    const happenedAt = latestEntry?.createdAt ?? latestSession?.endedAt ?? latestSession?.startedAt ?? new Date().toISOString();
    return {
      key,
      subjectId: latestEntry?.subjectId ?? first?.subjectId ?? "",
      chapterId: latestEntry?.chapterId ?? first?.chapterId ?? "",
      happenedAt,
      focusedSeconds: Math.max(sessionSeconds, journalSeconds),
      pauseSeconds: bucket.sessions.reduce((sum, session) => sum + session.pauseSeconds, 0),
      attempted: Math.max(sessionAttempts, journalAttempts),
      correct: Math.max(sessionCorrect, journalCorrect),
    };
  }).filter((record) => record.subjectId && record.chapterId);
}

export function buildChapterEvidence(chapters: Chapter[], sessions: StudySession[], entries: JournalEntry[], mistakes: Mistake[], resources: StudyResource[]): ChapterEvidence[] {
  return orderChapters(chapters).map((chapter) => {
    const chapterSessions = sessions.filter((session) => session.chapterId === chapter.id);
    const chapterEntries = entries.filter((entry) => entry.chapterId === chapter.id);
    const chapterEvidence = summarizeStudyEvidence(chapterSessions, chapterEntries);
    const chapterMistakes = mistakes.filter((mistake) => mistake.chapterId === chapter.id);
    const attempted = chapterEvidence.reduce((sum, record) => sum + record.attempted, 0);
    const correct = chapterEvidence.reduce((sum, record) => sum + record.correct, 0);
    const base = {
      chapterId: chapter.id,
      sessions: chapterEvidence.length,
      focusedMinutes: Math.round(chapterEvidence.reduce((sum, record) => sum + record.focusedSeconds, 0) / 60),
      journalEntries: chapterEntries.length,
      attempted,
      correct,
      accuracy: attempted ? Math.round(correct / attempted * 100) : chapter.questionsAttempted ? Math.round(chapter.questionsCorrect / chapter.questionsAttempted * 100) : 0,
      openMistakes: chapterMistakes.filter((mistake) => !mistake.resolved).length,
      resolvedMistakes: chapterMistakes.filter((mistake) => mistake.resolved).length,
      resources: resources.filter((resource) => resource.chapterId === chapter.id).length,
      lastEvidenceAt: chapterEvidence.map((record) => record.happenedAt).sort().at(-1),
    };
    return { ...base, evidenceLevel: evidenceLevel(base) };
  });
}

export function StudyAnalytics({ sessions, entries, tasks }: { sessions: StudySession[]; entries: JournalEntry[]; tasks: StudyTask[] }) {
  const [now, setNow] = useState(() => Date.now());
  const hasRunningSession = sessions.some((session) => session.timerState === "running");
  useEffect(() => {
    if (!hasRunningSession) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasRunningSession]);
  const evidence = summarizeStudyEvidence(sessions, entries, now);
  const focusedSeconds = evidence.reduce((sum, record) => sum + record.focusedSeconds, 0);
  const pauseSeconds = evidence.reduce((sum, record) => sum + record.pauseSeconds, 0);
  const attempted = evidence.reduce((sum, record) => sum + record.attempted, 0);
  const correct = evidence.reduce((sum, record) => sum + record.correct, 0);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const todayKey = evidenceDateKey(new Date().toISOString());
  const today = new Date(`${todayKey}T00:00:00+06:00`);
  const lastSeven = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = evidenceDateKey(date.toISOString());
    const seconds = evidence.filter((record) => evidenceDateKey(record.happenedAt) === key).reduce((sum, record) => sum + record.focusedSeconds, 0);
    return { key, label: date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Dhaka" }), minutes: Math.round(seconds / 60) };
  });
  const subjectRows = subjects.map((subject) => {
    const mine = evidence.filter((record) => record.subjectId === subject.id);
    return { subject, seconds: mine.reduce((sum, record) => sum + record.focusedSeconds, 0), sessions: mine.length };
  }).filter((row) => row.seconds || row.sessions).sort((a, b) => b.seconds - a.seconds);
  const chartConfig = { minutes: { label: "Recorded minutes", color: "#167EFA" } } satisfies ChartConfig;
  const statCards = [
    { label: "Recorded study time", value: formatDuration(focusedSeconds), detail: `${evidence.length} evidence block${evidence.length === 1 ? "" : "s"} · timer + journal`, tone: "blue" },
    { label: "Average study block", value: evidence.length ? formatDuration(Math.round(focusedSeconds / evidence.length)) : "0m", detail: pauseSeconds ? `${Math.round(pauseSeconds / 60)}m paused` : "No pause data yet", tone: "violet" },
    { label: "Answer accuracy", value: attempted ? `${Math.round(correct / attempted * 100)}%` : "—", detail: attempted ? `${correct}/${attempted} correct` : "Log answers in a journal or session", tone: "amber" },
    { label: "Task completion", value: tasks.length ? `${Math.round(completedTasks / tasks.length * 100)}%` : "—", detail: tasks.length ? `${completedTasks} of ${tasks.length} tasks closed` : "No tasks have been scheduled", tone: "emerald" },
  ];
  return <section className="analytics-panel">
    <div className="analytics-stat-grid">{statCards.map((stat) => <Card className={`analytics-stat-card ${stat.tone}`} key={stat.label}><CardHeader><CardDescription>{stat.label}</CardDescription><CardTitle>{stat.value}</CardTitle></CardHeader><CardContent><p>{stat.detail}</p></CardContent></Card>)}</div>
    <div className="analytics-grid"><Card className="analytics-chart-card"><CardHeader><CardDescription>LAST 7 DAYS</CardDescription><CardTitle>Recorded study minutes</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[260px] w-full"><BarChart accessibilityLayer data={lastSeven} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} /><YAxis tickLine={false} axisLine={false} width={34} allowDecimals={false} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="minutes" fill="var(--color-minutes)" radius={[8, 8, 3, 3]} /></BarChart></ChartContainer></CardContent></Card><Card className="analytics-subjects-card"><CardHeader><CardDescription>WHERE TIME GOES</CardDescription><CardTitle>Subject balance</CardTitle></CardHeader><CardContent>{subjectRows.length ? <div className="subject-analytics-list">{subjectRows.slice(0, 6).map(({ subject, seconds, sessions: count }) => <div className="subject-analytics-row" key={subject.id}><span className={`subject-token ${subject.accent}`}>{subject.shortName.slice(0, 2)}</span><p><strong>{subject.shortName}</strong><small>{count} study block{count === 1 ? "" : "s"}</small></p><b>{Math.round(seconds / 60)}m</b></div>)}</div> : <div className="feature-empty"><Timer /><p>Record a journal entry or focused session to see your real time balance.</p></div>}</CardContent></Card></div>
  </section>;
}

export function SyllabusEvidenceMap({ chapters, sessions, entries, mistakes, resources, onOpenResources }: { chapters: Chapter[]; sessions: StudySession[]; entries: JournalEntry[]; mistakes: Mistake[]; resources: StudyResource[]; onOpenResources?: (chapterId: string) => void }) {
  const [subjectId, setSubjectId] = useState("all");
  const evidence = buildChapterEvidence(chapters, sessions, entries, mistakes, resources).filter((item) => subjectId === "all" || byChapter(item.chapterId, chapters).subjectId === subjectId);
  const statusLabel = { none: "No evidence", light: "Light evidence", working: "Working evidence", "exam-ready": "Exam evidence" };
  return <section className="panel evidence-map"><div className="feature-heading"><div><small>SYLLABUS EVIDENCE MAP</small><h3>Can you prove this chapter is ready?</h3></div><label className="compact-select">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.shortName}</option>)}</select></label></div><div className="evidence-legend"><span><i className="none" />No evidence</span><span><i className="light" />Light</span><span><i className="working" />Working</span><span><i className="exam-ready" />Exam-ready</span></div><div className="evidence-table">{evidence.map((item) => { const chapter = byChapter(item.chapterId, chapters); const subject = bySubject(chapter.subjectId); return <article key={item.chapterId}><span className={`evidence-dot ${item.evidenceLevel}`} /><p><strong>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</strong><small>{subject.shortName} · {statusLabel[item.evidenceLevel]}</small></p><div className="evidence-numbers"><b>{item.focusedMinutes}m<small>focus</small></b><b>{item.attempted ? `${item.accuracy}%` : "—"}<small>accuracy</small></b><b>{item.openMistakes}<small>open gaps</small></b><b>{item.resources}<small>resources</small></b></div><button onClick={() => onOpenResources?.(chapter.id)} aria-label={`Open resources for ${chapter.title}`}><ArrowRight /></button></article>; })}</div></section>;
}


export function ExamModeFocus({ tasks, activeTaskId, onClose, onSaveSession, onUpdateTask }: { tasks: StudyTask[]; activeTaskId?: string | null; onClose: () => void; onSaveSession: (session: StudySession) => void; onUpdateTask: (task: StudyTask) => void }) {
  const candidates = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped");
  const [taskId, setTaskId] = useState(activeTaskId ?? candidates[0]?.id ?? "");
  const task = candidates.find((item) => item.id === taskId) ?? candidates[0];
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pauseSeconds, setPauseSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(0);
  const [correct, setCorrect] = useState(0);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(id); }, [running]);
  useEffect(() => { if (!running && startedAt && seconds > 0) { const id = window.setInterval(() => setPauseSeconds((value) => value + 1), 1000); return () => window.clearInterval(id); } }, [running, startedAt, seconds]);
  const begin = () => { if (!startedAt) setStartedAt(new Date().toISOString()); setRunning(true); if (task) onUpdateTask({ ...task, status: "in-progress" }); };
  const finish = () => { if (!task || !startedAt) return; const endedAt = new Date().toISOString(); onSaveSession({ id: crypto.randomUUID(), taskId: task.id, subjectId: task.subjectId, chapterId: task.chapterId, mode: "exam", startedAt, endedAt, focusedSeconds: seconds, pauseSeconds, completed: true, questionsAttempted: attempted || undefined, questionsCorrect: correct || undefined }); onUpdateTask({ ...task, focusedSeconds: (task.focusedSeconds ?? 0) + seconds, status: "in-progress" }); onClose(); };
  if (!task) return <main id="main-content" tabIndex={-1} className="page focus-page"><div className="focus-empty"><Exam size={42} /><h2>No open task to enter exam mode.</h2><p>Add or schedule a task first, then return here for a timed attempt.</p><button className="solid-cta" onClick={onClose}><ArrowRight />Return to Today</button></div></main>;
  return <main id="main-content" tabIndex={-1} className="page focus-page"><div className="focus-topbar"><button onClick={onClose}><X />Exit exam mode</button><span><Exam weight="fill" />Exam-mode focus</span><small>{task.duration} minute target</small></div><section className="focus-hero"><div className="focus-kicker"><span className={`subject-token ${bySubject(task.subjectId).accent}`}>{bySubject(task.subjectId).shortName.slice(0, 2)}</span><div><small>{bySubject(task.subjectId).shortName}</small><h2>{task.title}</h2></div></div><label className="focus-task-select">Change task<select value={task.id} onChange={(event) => { setTaskId(event.target.value); setRunning(false); setStartedAt(null); setSeconds(0); setPauseSeconds(0); }}>{candidates.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label></section><section className="focus-clock"><small>{running ? "FOCUSING NOW" : startedAt ? "PAUSED" : "READY WHEN YOU ARE"}</small><strong>{formatClock(seconds)}</strong><p>Pause time: {formatClock(pauseSeconds)}</p><div className="focus-actions">{running ? <button className="accent" onClick={() => setRunning(false)}><Pause weight="fill" />Pause</button> : <button className="solid-cta" onClick={begin}><Play weight="fill" />{startedAt ? "Resume" : "Start timed attempt"}</button>}{startedAt && <button className="finish" onClick={finish}><CheckCircle weight="fill" />Finish and save evidence</button>}</div></section><section className="focus-evidence"><article><small>QUESTIONS ATTEMPTED</small><input type="number" min="0" value={attempted} onChange={(event) => { const next = Math.max(0, Number(event.target.value)); setAttempted(next); setCorrect((value) => Math.min(value, next)); }} /></article><article><small>QUESTIONS CORRECT</small><input type="number" min="0" max={attempted} value={correct} onChange={(event) => setCorrect(Math.max(0, Math.min(attempted, Number(event.target.value))))} /></article><article><small>SESSION TARGET</small><strong>{task.duration}m</strong><p>{seconds >= task.duration * 60 ? "Target reached — finish when ready." : `${Math.max(0, task.duration - Math.floor(seconds / 60))} min remaining`}</p></article></section></main>;
}

const MAX_RESOURCE_BYTES = 120 * 1024 * 1024;

type UploadedResource = Pick<StudyResource, "url" | "storagePath" | "fileName" | "mimeType" | "fileSize">;

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function ResourceLibrary({ resources, curatedTextbooks, chapters, initialChapterId, save, remove, upload, open }: { resources: StudyResource[]; curatedTextbooks: CuratedTextbook[]; chapters: Chapter[]; initialChapterId?: string; save: (resource: StudyResource) => void; remove: (resource: StudyResource) => void; upload: (file: File) => Promise<UploadedResource>; open: (resource: StudyResource) => Promise<void> }) {
  const initialSubjectId = initialChapterId ? chapters.find((chapter) => chapter.id === initialChapterId)?.subjectId ?? "all" : "all";
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [chapterId, setChapterId] = useState(initialChapterId ?? "all");
  const [adding, setAdding] = useState(false);
  const [sourceMode, setSourceMode] = useState<"url" | "upload">("url");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<ResourceKind>("question-bank");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectChapters = orderChapters(chapters.filter((chapter) => subjectId === "all" || chapter.subjectId === subjectId));
  const formSubjectId = subjectId === "all" ? subjects[0]?.id ?? "" : subjectId;
  const formChapters = orderChapters(chapters.filter((chapter) => chapter.subjectId === formSubjectId));
  const formChapterId = formChapters.some((chapter) => chapter.id === chapterId) ? chapterId : formChapters[0]?.id ?? "";
  const visible = resources.filter((resource) => (subjectId === "all" || resource.subjectId === subjectId) && (chapterId === "all" || resource.chapterId === chapterId));
  const visibleBooks = curatedTextbooks.filter((book) => subjectId === "all" || book.subjectId === subjectId);
  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (candidate.size > MAX_RESOURCE_BYTES) {
      setFile(null);
      setError(`${candidate.name} is larger than the 120 MB per-file limit.`);
      return;
    }
    setError("");
    setFile(candidate);
    if (!title.trim()) setTitle(candidate.name.replace(/\.[^/.]+$/, ""));
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };
  const resetForm = () => { setTitle(""); setUrl(""); setFile(null); setNote(""); setError(""); setSourceMode("url"); };
  const handleOpen = async (resource: StudyResource) => {
    try {
      await open(resource);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Could not open this resource.");
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const chapter = chapters.find((item) => item.id === formChapterId) ?? formChapters[0];
    if (!chapter || !title.trim()) return setError("Add a title and chapter first.");
    if (sourceMode === "url" && !url.trim()) return setError("Add a valid resource URL.");
    if (sourceMode === "upload" && !file) return setError("Choose a file or drop it into the upload area.");
    setSaving(true);
    setError("");
    try {
      const uploaded = sourceMode === "upload" && file ? await upload(file) : { url: url.trim() };
      save({ id: crypto.randomUUID(), subjectId: chapter.subjectId, chapterId: chapter.id, title: title.trim(), url: uploaded.url, kind: sourceMode === "upload" && kind === "website" ? "other" : kind, source: sourceMode, storagePath: uploaded.storagePath, fileName: uploaded.fileName, mimeType: uploaded.mimeType, fileSize: uploaded.fileSize, note: note.trim() || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      resetForm();
      setAdding(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save this resource.");
    } finally {
      setSaving(false);
    }
  };
  return <main id="main-content" tabIndex={-1} className="page resources-page"><SectionTitle kicker="YOUR STUDY MATERIALS, ONE PLACE" title="Resource library"><button className="accent" onClick={() => { setAdding(!adding); if (adding) resetForm(); }}>{adding ? <X /> : <Plus />}{adding ? "Close" : "Add resource"}</button></SectionTitle>{adding && <form className="panel resource-form" onSubmit={(event) => void submit(event)}><div className="feature-heading"><div><small>CURATE, DON&apos;T COLLECT</small><h3>Add a chapter resource</h3><p>Use a link for an online source or upload a file you already study from.</p></div><BookOpen /></div><div className="resource-source-tabs" role="tablist" aria-label="Resource source"><button type="button" className={sourceMode === "url" ? "active" : ""} onClick={() => { setSourceMode("url"); setError(""); }}> <LinkSimple /> URL</button><button type="button" className={sourceMode === "upload" ? "active" : ""} onClick={() => { setSourceMode("upload"); setError(""); }}><UploadSimple /> Upload file</button></div><div className="form-row"><label>Subject<select value={formSubjectId} onChange={(event) => { const nextSubject = event.target.value; setSubjectId(nextSubject); setChapterId(chapters.find((chapter) => chapter.subjectId === nextSubject)?.id ?? "all"); }}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={formChapterId} onChange={(event) => setChapterId(event.target.value)}>{formChapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label></div><div className="form-row"><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chapter 9 CQ bank" /></label>{sourceMode === "url" ? <label>URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label> : <div className={`resource-dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><input ref={fileInputRef} type="file" hidden accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => chooseFile(event.target.files?.[0])} /><UploadSimple /><strong>{file ? file.name : "Drop a file here or browse"}</strong><small>{file ? formatFileSize(file.size) : "PDF, DOCX, images, or text · maximum 120 MB per file"}</small></div>}</div><div className="form-row"><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as ResourceKind)}>{resourceKinds.map((item) => <option value={item} key={item}>{resourceKindLabel[item]}</option>)}</select></label><label>Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this is worth opening" /></label></div>{error && <p className="resource-form-error" role="alert">{error}</p>}<button className="solid-cta" disabled={saving}>{saving ? <><UploadSimple />Uploading…</> : <><Plus />Save resource</>}</button></form>}<section className="resource-controls"><label>Subject<select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setChapterId("all"); }}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.shortName}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}><option value="all">All chapters</option>{subjectChapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><span>{visible.length} personal resource{visible.length === 1 ? "" : "s"} · {visibleBooks.length} board textbook{visibleBooks.length === 1 ? "" : "s"}</span></section>{visibleBooks.length > 0 && <section className="curated-textbooks"><div className="feature-heading"><div><small>OFFICIAL BOARD MATERIALS</small><h3>Essential NCTB textbooks</h3><p>Official Class 9–10 textbook links, kept separate from your personal uploads.</p></div><Books /></div><div className="curated-textbook-grid">{visibleBooks.map((book) => <article className="curated-textbook-card" key={book.id}><div><small>{book.board} · {book.academicYear} · {bySubject(book.subjectId).shortName}</small><h4>{book.title}</h4><p>{book.note}</p></div><div className="resource-actions"><a href={book.url} target="_blank" rel="noreferrer"><ArrowRight />Open book</a>{book.alternateUrl && <a href={book.alternateUrl} target="_blank" rel="noreferrer">Backup link</a>}</div><a className="curated-source" href={book.sourcePage} target="_blank" rel="noreferrer">{book.sourceLabel}</a></article>)}</div></section>}<section className="resource-grid">{visible.length ? visible.map((resource) => <article className="resource-card" key={resource.id}><div className="resource-icon">{resource.source === "upload" ? <UploadSimple /> : <LinkSimple />}</div><div><small>{resourceKindLabel[resource.kind]} · {bySubject(resource.subjectId).shortName}{resource.source === "upload" ? ` · ${formatFileSize(resource.fileSize)}` : ""}</small><h3>{resource.title}</h3><p>{byChapter(resource.chapterId, chapters).title}{resource.fileName ? ` · ${resource.fileName}` : ""}</p>{resource.note && <em>{resource.note}</em>}</div><div className="resource-actions"><button onClick={() => void handleOpen(resource)}><ArrowRight />Open</button><button onClick={() => remove(resource)} aria-label={`Delete ${resource.title}`}><Trash /></button></div></article>) : <div className="empty resource-empty"><div className="empty-icon"><Books /></div><small>NO PERSONAL RESOURCES</small><h3>Keep the resources you actually use.</h3><p>Save one link or upload one file for a specific chapter. The board textbook collection is above.</p><button className="solid-cta" onClick={() => setAdding(true)}><Plus />Add a resource</button></div>}</section></main>;
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) { return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{children}</div>; }
