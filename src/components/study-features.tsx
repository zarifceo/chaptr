"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Books, CheckCircle, LinkSimple, Pause, Play, Plus, Timer, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { chapters as seedChapters, subjects, orderChapters } from "@/lib/academic-data";
import type { Chapter, ChapterEvidence, CuratedTextbook, ExamSession, JournalEntry, Mistake, ResourceKind, StudyResource, StudySession, StudyTask } from "@/lib/types";

const bySubject = (id: string) => subjects.find((subject) => subject.id === id)!;
const byChapter = (id: string, list = seedChapters) => list.find((chapter) => chapter.id === id)!;
const resourceKinds: ResourceKind[] = ["textbook", "question-bank", "video", "notes", "website", "other"];
const resourceKindLabel: Record<ResourceKind, string> = { textbook: "Textbook", "question-bank": "Question bank", video: "Video", notes: "Notes", website: "Website", other: "Other" };

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const formatHourTick = (value: number) => `${value}h`;
const hourDomainMax = (dataMax: number) => Math.max(1, Math.ceil(dataMax));

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
    return { key, label: date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Dhaka" }), hours: Number((seconds / 3600).toFixed(2)) };
  });
  const subjectRows = subjects.map((subject) => {
    const mine = evidence.filter((record) => record.subjectId === subject.id);
    return { subject, seconds: mine.reduce((sum, record) => sum + record.focusedSeconds, 0), sessions: mine.length };
  }).filter((row) => row.seconds || row.sessions).sort((a, b) => b.seconds - a.seconds);
  const chartConfig = { hours: { label: "Recorded hours", color: "#167EFA" } } satisfies ChartConfig;
  const statCards = [
    { label: "Recorded study time", value: formatDuration(focusedSeconds), detail: `${evidence.length} evidence block${evidence.length === 1 ? "" : "s"} · timer + journal`, tone: "blue" },
    { label: "Average study block", value: evidence.length ? formatDuration(Math.round(focusedSeconds / evidence.length)) : "0m", detail: pauseSeconds ? `${Math.round(pauseSeconds / 60)}m paused` : "No pause data yet", tone: "violet" },
    { label: "Answer accuracy", value: attempted ? `${Math.round(correct / attempted * 100)}%` : "—", detail: attempted ? `${correct}/${attempted} correct` : "Log answers in a journal or session", tone: "amber" },
    { label: "Task completion", value: tasks.length ? `${Math.round(completedTasks / tasks.length * 100)}%` : "—", detail: tasks.length ? `${completedTasks} of ${tasks.length} tasks closed` : "No tasks have been scheduled", tone: "emerald" },
  ];
  return <section className="analytics-panel">
    <div className="analytics-stat-grid">{statCards.map((stat) => <Card className={`analytics-stat-card ${stat.tone}`} key={stat.label}><CardHeader><CardDescription>{stat.label}</CardDescription><CardTitle>{stat.value}</CardTitle></CardHeader><CardContent><p>{stat.detail}</p></CardContent></Card>)}</div>
    <div className="analytics-grid"><Card className="analytics-chart-card"><CardHeader><CardDescription>LAST 7 DAYS</CardDescription><CardTitle>Recorded study hours</CardTitle></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[260px] w-full"><BarChart accessibilityLayer data={lastSeven} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} /><YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} domain={[0, hourDomainMax]} tickFormatter={formatHourTick} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="hours" fill="var(--color-hours)" radius={[8, 8, 3, 3]} /></BarChart></ChartContainer></CardContent></Card><Card className="analytics-subjects-card"><CardHeader><CardDescription>WHERE TIME GOES</CardDescription><CardTitle>Subject balance</CardTitle></CardHeader><CardContent>{subjectRows.length ? <div className="subject-analytics-list">{subjectRows.slice(0, 6).map(({ subject, seconds, sessions: count }) => <div className="subject-analytics-row" key={subject.id}><span className={`subject-token ${subject.accent}`}>{subject.shortName.slice(0, 2)}</span><p><strong>{subject.shortName}</strong><small>{count} study block{count === 1 ? "" : "s"}</small></p><b>{Math.round(seconds / 60)}m</b></div>)}</div> : <div className="feature-empty"><Timer /><p>Record a journal entry or focused session to see your real time balance.</p></div>}</CardContent></Card></div>
  </section>;
}

export function SyllabusEvidenceMap({ chapters, sessions, entries, mistakes, resources, onOpenResources }: { chapters: Chapter[]; sessions: StudySession[]; entries: JournalEntry[]; mistakes: Mistake[]; resources: StudyResource[]; onOpenResources?: (chapterId: string) => void }) {
  const [subjectId, setSubjectId] = useState("all");
  const evidence = buildChapterEvidence(chapters, sessions, entries, mistakes, resources).filter((item) => subjectId === "all" || byChapter(item.chapterId, chapters).subjectId === subjectId);
  const statusLabel = { none: "No evidence", light: "Light evidence", working: "Working evidence", "exam-ready": "Exam evidence" };
  return <section className="panel evidence-map"><div className="feature-heading"><div><small>SYLLABUS EVIDENCE MAP</small><h3>Can you prove this chapter is ready?</h3></div><label className="compact-select">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.shortName}</option>)}</select></label></div><div className="evidence-legend"><span><i className="none" />No evidence</span><span><i className="light" />Light</span><span><i className="working" />Working</span><span><i className="exam-ready" />Exam-ready</span></div><div className="evidence-table">{evidence.map((item) => { const chapter = byChapter(item.chapterId, chapters); const subject = bySubject(chapter.subjectId); return <article key={item.chapterId}><span className={`evidence-dot ${item.evidenceLevel}`} /><p><strong>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</strong><small>{subject.shortName} · {statusLabel[item.evidenceLevel]}</small></p><div className="evidence-numbers"><b>{item.focusedMinutes}m<small>focus</small></b><b>{item.attempted ? `${item.accuracy}%` : "—"}<small>accuracy</small></b><b>{item.openMistakes}<small>open gaps</small></b><b>{item.resources}<small>resources</small></b></div><button onClick={() => onOpenResources?.(chapter.id)} aria-label={`Open resources for ${chapter.title}`}><ArrowRight /></button></article>; })}</div></section>;
}


export function ExamModeFocus({ chapters, sessions, onClose, onSaveSession }: { chapters: Chapter[]; sessions: ExamSession[]; onClose: () => void; onSaveSession: (session: ExamSession) => void }) {
  const openSessions = sessions.filter((session) => session.status !== "completed").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const firstChapter = chapters[0];
  const availableSubjects = subjects.filter((subject) => chapters.some((chapter) => chapter.subjectId === subject.id));
  const [subjectId, setSubjectId] = useState(firstChapter?.subjectId ?? "");
  const [chapterId, setChapterId] = useState(firstChapter?.id ?? "");
  const [sessionId, setSessionId] = useState("");
  const [targetMinutes, setTargetMinutes] = useState(45);
  const [now, setNow] = useState(() => Date.now());
  const current = openSessions.find((session) => session.id === sessionId);
  const running = current?.status === "running";
  const subjectChapters = chapters.filter((chapter) => chapter.subjectId === subjectId);
  const elapsedSeconds = current ? current.elapsedSeconds + (running && current.lastResumedAt ? Math.max(0, Math.floor((now - new Date(current.lastResumedAt).getTime()) / 1000)) : 0) : 0;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!running || !current) return;
    const id = window.setInterval(() => {
      const updatedAt = new Date().toISOString();
      onSaveSession({ ...current, elapsedSeconds: current.elapsedSeconds + Math.max(0, Math.floor((Date.now() - new Date(current.lastResumedAt ?? updatedAt).getTime()) / 1000)), updatedAt });
    }, 10000);
    return () => window.clearInterval(id);
  }, [current, onSaveSession, running]);
  const createSession = () => {
    const chapter = chapters.find((item) => item.id === chapterId);
    if (!chapter) return undefined;
    const timestamp = new Date().toISOString();
    const created: ExamSession = { id: crypto.randomUUID(), subjectId: chapter.subjectId, chapterId: chapter.id, status: "draft", targetMinutes: Math.max(5, Math.min(600, targetMinutes)), elapsedSeconds: 0, mcqAttempted: 0, mcqCorrect: 0, cqAttempted: 0, cqCorrect: 0, sqAttempted: 0, sqCorrect: 0, createdAt: timestamp, updatedAt: timestamp };
    onSaveSession(created);
    setSessionId(created.id);
    return created;
  };
  const persist = (patch: Partial<ExamSession>) => {
    if (!current) return;
    onSaveSession({ ...current, ...patch, updatedAt: new Date().toISOString() });
  };
  const start = () => {
    const session = current ?? createSession();
    if (!session) return;
    const timestamp = new Date().toISOString();
    onSaveSession({ ...session, status: "running", startedAt: session.startedAt ?? timestamp, lastResumedAt: timestamp, updatedAt: timestamp });
    setNow(Date.now());
  };
  const pause = () => {
    if (!current) return;
    const timestamp = new Date().toISOString();
    onSaveSession({ ...current, status: "paused", elapsedSeconds, lastResumedAt: undefined, updatedAt: timestamp });
  };
  const finish = () => {
    if (!current) return;
    const timestamp = new Date().toISOString();
    onSaveSession({ ...current, status: "completed", elapsedSeconds, lastResumedAt: undefined, endedAt: timestamp, updatedAt: timestamp });
    setSessionId("");
  };
  const updateCount = (field: "mcq" | "cq" | "sq", key: "Attempted" | "Correct", value: number) => {
    if (!current) return;
    const attemptedKey = `${field}Attempted` as const;
    const correctKey = `${field}Correct` as const;
    const nextAttempted = key === "Attempted" ? Math.max(0, value) : current[attemptedKey];
    const nextCorrect = key === "Correct" ? Math.max(0, Math.min(nextAttempted, value)) : Math.min(current[correctKey], nextAttempted);
    persist({ [attemptedKey]: nextAttempted, [correctKey]: nextCorrect });
  };
  const leave = () => {
    if (current?.status === "running") pause();
    onClose();
  };
  const selectedChapter = current ? chapters.find((chapter) => chapter.id === current.chapterId) : chapters.find((chapter) => chapter.id === chapterId);
  const selectedSubject = selectedChapter ? bySubject(selectedChapter.subjectId) : availableSubjects[0] ?? subjects[0]!;
  const questionCards = current ? ([
    ["MCQ", "mcqAttempted", "mcqCorrect"],
    ["CQ", "cqAttempted", "cqCorrect"],
    ["SQ", "sqAttempted", "sqCorrect"],
  ] as const) : [];
  return <main id="main-content" tabIndex={-1} className="page focus-page"><section className="focus-hero"><div className="focus-kicker"><span className={`subject-token ${selectedSubject.accent}`}>{selectedSubject.shortName.slice(0, 2)}</span><div><small>EXAM MODE · IN-APP ONLY</small><h2>{selectedChapter?.title ?? "Choose a chapter"}</h2></div></div><button type="button" onClick={leave}><ArrowRight />Return to Today</button></section><section className="exam-builder panel"><div className="feature-heading"><div><small>CHOOSE ANY SSC CHAPTER</small><h3>{current ? "Saved exam attempt" : "Set up an exam attempt"}</h3><p>Choose a subject first, then a chapter. This does not depend on your study-task queue.</p></div>{openSessions.length > 0 && <label className="focus-task-select">Resume saved attempt<select value={sessionId} onChange={(event) => setSessionId(event.target.value)}><option value="">New attempt</option>{openSessions.map((session) => <option value={session.id} key={session.id}>{bySubject(session.subjectId).shortName} · {byChapter(session.chapterId, chapters).title} · {session.status}</option>)}</select></label>}</div>{!current && <div className="exam-choice-grid"><label>Subject<select value={subjectId} onChange={(event) => { const nextSubjectId = event.target.value; setSubjectId(nextSubjectId); setChapterId(chapters.find((chapter) => chapter.subjectId === nextSubjectId)?.id ?? ""); }}>{availableSubjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label className="exam-chapter-picker">Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>{subjectChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><label>Target time (not a limit)<input type="number" min="5" max="600" value={targetMinutes} onChange={(event) => setTargetMinutes(Math.max(5, Math.min(600, Number(event.target.value))))} /><small>You can continue for as long as needed.</small></label></div>}{!current && <button className="solid-cta" type="button" onClick={start}><Play weight="fill" />Start exam attempt</button>}</section>{current && <><section className="focus-clock"><small>{running ? "EXAM IN PROGRESS" : current.status === "paused" ? "PAUSED · SAVED" : "READY WHEN YOU ARE"}</small><strong>{formatClock(elapsedSeconds)}</strong><p>Target: {current.targetMinutes} minutes · You may continue beyond it. This target never stops the attempt.</p><div className="focus-actions">{running ? <button className="accent" onClick={pause}><Pause weight="fill" />Pause and save</button> : <button className="solid-cta" onClick={start}><Play weight="fill" />{current.status === "paused" ? "Resume attempt" : "Start attempt"}</button>}{current.status !== "draft" && <button className="finish" onClick={finish}><CheckCircle weight="fill" />Finish and save evidence</button>}</div></section><section className="focus-evidence">{questionCards.map(([label, attemptedKey, correctKey]) => <article key={label}><small>{label} QUESTIONS</small><label>Attempted<input type="number" min="0" value={current[attemptedKey]} onChange={(event) => updateCount(label.toLowerCase() as "mcq" | "cq" | "sq", "Attempted", Number(event.target.value))} /></label><label>Correct<input type="number" min="0" max={current[attemptedKey]} value={current[correctKey]} onChange={(event) => updateCount(label.toLowerCase() as "mcq" | "cq" | "sq", "Correct", Number(event.target.value))} /></label></article>)}</section></>}{!current && <section className="exam-history panel"><small>RESUMABLE ATTEMPTS</small><p>Exam progress is saved to your account when you pause and while you work. You can return here later without losing the attempt.</p></section>}</main>;
}

const MAX_RESOURCE_BYTES = 25 * 1024 * 1024;

type UploadedResource = Pick<StudyResource, "url" | "storagePath" | "fileName" | "mimeType" | "fileSize">;

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function ResourceLibrary({ resources, curatedTextbooks, chapters, initialChapterId, preferredKinds, save, remove, upload, open }: { resources: StudyResource[]; curatedTextbooks: CuratedTextbook[]; chapters: Chapter[]; initialChapterId?: string; preferredKinds: ResourceKind[]; save: (resource: StudyResource) => Promise<void>; remove: (resource: StudyResource) => void; upload: (file: File) => Promise<UploadedResource>; open: (resource: StudyResource) => Promise<void> }) {
  const initialSubjectId = initialChapterId ? chapters.find((chapter) => chapter.id === initialChapterId)?.subjectId ?? "all" : "all";
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [chapterId, setChapterId] = useState(initialChapterId ?? "all");
  const [adding, setAdding] = useState(false);
  const [sourceMode, setSourceMode] = useState<"url" | "upload">("url");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<ResourceKind>(preferredKinds[0] ?? "question-bank");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectChapters = orderChapters(chapters.filter((chapter) => subjectId === "all" || chapter.subjectId === subjectId));
  const formSubjectId = subjectId === "all" ? subjects[0]?.id ?? "" : subjectId;
  const formChapters = orderChapters(chapters.filter((chapter) => chapter.subjectId === formSubjectId));
  const formChapterId = formChapters.some((chapter) => chapter.id === chapterId) ? chapterId : formChapters[0]?.id ?? "";
  const preferredKindRank = new Map(preferredKinds.map((item, index) => [item, index]));
  const orderedKinds = [...resourceKinds].sort((a, b) => (preferredKindRank.get(a) ?? 99) - (preferredKindRank.get(b) ?? 99));
  const visible = resources.filter((resource) => (subjectId === "all" || resource.subjectId === subjectId) && (chapterId === "all" || resource.chapterId === chapterId)).sort((a, b) => (preferredKindRank.get(a.kind) ?? 99) - (preferredKindRank.get(b.kind) ?? 99) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const visibleBooks = curatedTextbooks.filter((book) => subjectId === "all" || book.subjectId === subjectId);
  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (candidate.size > MAX_RESOURCE_BYTES) {
      setFile(null);
      setError(`${candidate.name} is larger than the 25 MB per-file limit.`);
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
  const resetForm = () => { setTitle(""); setUrl(""); setFile(null); setKind(preferredKinds[0] ?? "question-bank"); setNote(""); setError(""); setSourceMode("url"); };
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
      await save({ id: crypto.randomUUID(), subjectId: chapter.subjectId, chapterId: chapter.id, title: title.trim(), url: uploaded.url, kind: sourceMode === "upload" && kind === "website" ? "other" : kind, source: sourceMode, storagePath: uploaded.storagePath, fileName: uploaded.fileName, mimeType: uploaded.mimeType, fileSize: uploaded.fileSize, note: note.trim() || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      resetForm();
      setAdding(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save this resource.");
    } finally {
      setSaving(false);
    }
  };
  return <main id="main-content" tabIndex={-1} className="page resources-page"><SectionTitle kicker="YOUR STUDY MATERIALS, ONE PLACE" title="Resource library"><button className="accent" onClick={() => { setAdding(!adding); if (adding) resetForm(); }}>{adding ? <X /> : <Plus />}{adding ? "Close" : "Add resource"}</button></SectionTitle>{adding && <form className="panel resource-form" onSubmit={(event) => void submit(event)}><div className="feature-heading"><div><small>CURATE, DON&apos;T COLLECT</small><h3>Add a chapter resource</h3><p>Use a link for an online source or upload a file you already study from. Your preferred resource types appear first.</p></div><BookOpen /></div><div className="resource-source-tabs" role="tablist" aria-label="Resource source"><button type="button" className={sourceMode === "url" ? "active" : ""} onClick={() => { setSourceMode("url"); setError(""); }}> <LinkSimple /> URL</button><button type="button" className={sourceMode === "upload" ? "active" : ""} onClick={() => { setSourceMode("upload"); setError(""); }}><UploadSimple /> Upload file</button></div><div className="form-row"><label>Subject<select value={formSubjectId} onChange={(event) => { const nextSubject = event.target.value; setSubjectId(nextSubject); setChapterId(chapters.find((chapter) => chapter.subjectId === nextSubject)?.id ?? "all"); }}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={formChapterId} onChange={(event) => setChapterId(event.target.value)}>{formChapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label></div><div className="form-row"><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chapter 9 CQ bank" /></label>{sourceMode === "url" ? <label>URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label> : <div className={`resource-dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><input ref={fileInputRef} type="file" hidden accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => chooseFile(event.target.files?.[0])} /><UploadSimple /><strong>{file ? file.name : "Drop a file here or browse"}</strong><small>{file ? formatFileSize(file.size) : "PDF, DOCX, images, or text · maximum 25 MB per file"}</small></div>}</div><div className="form-row"><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as ResourceKind)}>{orderedKinds.map((item) => <option value={item} key={item}>{resourceKindLabel[item]}{preferredKindRank.has(item) ? " · preferred" : ""}</option>)}</select></label><label>Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this is worth opening" /></label></div>{error && <p className="resource-form-error" role="alert">{error}</p>}<button type="submit" className="solid-cta" disabled={saving}>{saving ? <><UploadSimple />{sourceMode === "upload" ? "Uploading…" : "Saving…"}</> : <><Plus />Save resource</>}</button></form>}<section className="resource-controls"><label>Subject<select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setChapterId("all"); }}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.shortName}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}><option value="all">All chapters</option>{subjectChapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><span>{visible.length} personal resource{visible.length === 1 ? "" : "s"} · {visibleBooks.length} board textbook{visibleBooks.length === 1 ? "" : "s"}</span></section>{visibleBooks.length > 0 && <section className="curated-textbooks"><div className="feature-heading"><div><small>OFFICIAL BOARD MATERIALS</small><h3>Essential NCTB textbooks</h3><p>Official Class 9–10 textbook links, kept separate from your personal uploads.</p></div><Books /></div><div className="curated-textbook-grid">{visibleBooks.map((book) => <article className="curated-textbook-card" key={book.id}><div><small>{book.board} · {book.academicYear} · {bySubject(book.subjectId).shortName}</small><h4>{book.title}</h4><p>{book.note}</p></div><div className="resource-actions"><a href={book.url} target="_blank" rel="noreferrer"><ArrowRight />Open book</a>{book.alternateUrl && <a href={book.alternateUrl} target="_blank" rel="noreferrer">Backup link</a>}</div><a className="curated-source" href={book.sourcePage} target="_blank" rel="noreferrer">{book.sourceLabel}</a></article>)}</div></section>}<section className="resource-grid">{visible.length ? visible.map((resource) => <article className="resource-card" key={resource.id}><div className="resource-icon">{resource.source === "upload" ? <UploadSimple /> : <LinkSimple />}</div><div><small>{resourceKindLabel[resource.kind]} · {bySubject(resource.subjectId).shortName}{resource.source === "upload" ? ` · ${formatFileSize(resource.fileSize)}` : ""}</small><h3>{resource.title}</h3><p>{byChapter(resource.chapterId, chapters).title}{resource.fileName ? ` · ${resource.fileName}` : ""}</p>{resource.note && <em>{resource.note}</em>}</div><div className="resource-actions"><button onClick={() => void handleOpen(resource)}><ArrowRight />Open</button><button onClick={() => remove(resource)} aria-label={`Delete ${resource.title}`}><Trash /></button></div></article>) : <div className="empty resource-empty"><div className="empty-icon"><Books /></div><small>NO PERSONAL RESOURCES</small><h3>Keep the resources you actually use.</h3><p>Save one link or upload one file for a specific chapter. The board textbook collection is above.</p><button className="solid-cta" onClick={() => setAdding(true)}><Plus />Add a resource</button></div>}</section></main>;
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) { return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{children}</div>; }
