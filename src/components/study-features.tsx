"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Books, CheckCircle, Clock, Exam, LinkSimple, Pause, Play, Plus, Timer, Trash, X } from "@phosphor-icons/react";
import { chapters as seedChapters, subjects } from "@/lib/academic-data";
import type { Chapter, ChapterEvidence, JournalEntry, Mistake, ResourceKind, StudyResource, StudySession, StudyTask } from "@/lib/types";

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

export function buildChapterEvidence(chapters: Chapter[], sessions: StudySession[], entries: JournalEntry[], mistakes: Mistake[], resources: StudyResource[]): ChapterEvidence[] {
  return chapters.map((chapter) => {
    const chapterSessions = sessions.filter((session) => session.chapterId === chapter.id);
    const chapterEntries = entries.filter((entry) => entry.chapterId === chapter.id);
    const chapterMistakes = mistakes.filter((mistake) => mistake.chapterId === chapter.id);
    const attempted = chapterEntries.reduce((sum, entry) => sum + entry.attempted, 0) + chapterSessions.reduce((sum, session) => sum + (session.questionsAttempted ?? 0), 0);
    const correct = chapterEntries.reduce((sum, entry) => sum + entry.correct, 0) + chapterSessions.reduce((sum, session) => sum + (session.questionsCorrect ?? 0), 0);
    const base = {
      chapterId: chapter.id,
      sessions: chapterSessions.length,
      focusedMinutes: Math.round(chapterSessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / 60),
      journalEntries: chapterEntries.length,
      attempted,
      correct,
      accuracy: attempted ? Math.round(correct / attempted * 100) : chapter.questionsAttempted ? Math.round(chapter.questionsCorrect / chapter.questionsAttempted * 100) : 0,
      openMistakes: chapterMistakes.filter((mistake) => !mistake.resolved).length,
      resolvedMistakes: chapterMistakes.filter((mistake) => mistake.resolved).length,
      resources: resources.filter((resource) => resource.chapterId === chapter.id).length,
      lastEvidenceAt: [...chapterSessions.map((session) => session.endedAt ?? session.startedAt), ...chapterEntries.map((entry) => entry.createdAt)].sort().at(-1),
    };
    return { ...base, evidenceLevel: evidenceLevel(base) };
  });
}

export function StudyAnalytics({ sessions, entries, tasks }: { sessions: StudySession[]; entries: JournalEntry[]; tasks: StudyTask[] }) {
  const completedSessions = sessions.filter((session) => session.endedAt);
  const focusedSeconds = completedSessions.reduce((sum, session) => sum + session.focusedSeconds, 0);
  const pauseSeconds = completedSessions.reduce((sum, session) => sum + session.pauseSeconds, 0);
  const attempted = entries.reduce((sum, entry) => sum + entry.attempted, 0) + sessions.reduce((sum, session) => sum + (session.questionsAttempted ?? 0), 0);
  const correct = entries.reduce((sum, entry) => sum + entry.correct, 0) + sessions.reduce((sum, session) => sum + (session.questionsCorrect ?? 0), 0);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const today = new Date();
  const lastSeven = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const seconds = completedSessions.filter((session) => session.startedAt.slice(0, 10) === key).reduce((sum, session) => sum + session.focusedSeconds, 0);
    return { key, label: date.toLocaleDateString("en-GB", { weekday: "short" }), seconds };
  });
  const maxDay = Math.max(1, ...lastSeven.map((day) => day.seconds));
  const subjectRows = subjects.map((subject) => {
    const mine = completedSessions.filter((session) => session.subjectId === subject.id);
    return { subject, seconds: mine.reduce((sum, session) => sum + session.focusedSeconds, 0), sessions: mine.length };
  }).filter((row) => row.seconds || row.sessions).sort((a, b) => b.seconds - a.seconds);
  return <section className="analytics-panel">
    <div className="analytics-stat-grid"><article className="lilac"><small>Focused time</small><strong>{formatDuration(focusedSeconds)}</strong><span>{completedSessions.length} saved sessions</span></article><article className="mint"><small>Average session</small><strong>{completedSessions.length ? formatDuration(Math.round(focusedSeconds / completedSessions.length)) : "0m"}</strong><span>{pauseSeconds ? `${Math.round(pauseSeconds / 60)}m paused` : "No pause data yet"}</span></article><article className="yellow"><small>Answer accuracy</small><strong>{attempted ? `${Math.round(correct / attempted * 100)}%` : "—"}</strong><span>{attempted ? `${correct}/${attempted} correct` : "Log evidence in a session"}</span></article><article className="pink"><small>Task completion</small><strong>{tasks.length ? `${Math.round(completedTasks / tasks.length * 100)}%` : "0%"}</strong><span>{completedTasks} of {tasks.length} tasks closed</span></article></div>
    <div className="analytics-grid"><article className="panel analytics-chart"><div className="feature-heading"><div><small>LAST 7 DAYS</small><h3>Focused minutes</h3></div><ChartIcon /></div><div className="session-bars">{lastSeven.map((day) => <div key={day.key}><span>{day.label}</span><i><b style={{ height: `${Math.max(8, day.seconds / maxDay * 100)}%` }} /></i><strong>{Math.round(day.seconds / 60)}m</strong></div>)}</div></article><article className="panel analytics-subjects"><div className="feature-heading"><div><small>WHERE TIME GOES</small><h3>Subject balance</h3></div><Clock /></div>{subjectRows.length ? subjectRows.slice(0, 6).map(({ subject, seconds, sessions: count }) => <div className="subject-analytics-row" key={subject.id}><span className={`subject-token ${subject.accent}`}>{subject.shortName.slice(0, 2)}</span><p><strong>{subject.shortName}</strong><small>{count} session{count === 1 ? "" : "s"}</small></p><b>{Math.round(seconds / 60)}m</b></div>) : <div className="feature-empty"><Timer /><p>Start a focused session to see your real time balance.</p></div>}</article></div>
  </section>;
}

export function SyllabusEvidenceMap({ chapters, sessions, entries, mistakes, resources, onOpenResources }: { chapters: Chapter[]; sessions: StudySession[]; entries: JournalEntry[]; mistakes: Mistake[]; resources: StudyResource[]; onOpenResources?: (chapterId: string) => void }) {
  const [subjectId, setSubjectId] = useState("all");
  const evidence = buildChapterEvidence(chapters, sessions, entries, mistakes, resources).filter((item) => subjectId === "all" || byChapter(item.chapterId, chapters).subjectId === subjectId);
  const statusLabel = { none: "No evidence", light: "Light evidence", working: "Working evidence", "exam-ready": "Exam evidence" };
  return <section className="panel evidence-map"><div className="feature-heading"><div><small>SYLLABUS EVIDENCE MAP</small><h3>Can you prove this chapter is ready?</h3></div><label className="compact-select">Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.shortName}</option>)}</select></label></div><div className="evidence-legend"><span><i className="none" />No evidence</span><span><i className="light" />Light</span><span><i className="working" />Working</span><span><i className="exam-ready" />Exam-ready</span></div><div className="evidence-table">{evidence.map((item) => { const chapter = byChapter(item.chapterId, chapters); const subject = bySubject(chapter.subjectId); return <article key={item.chapterId}><span className={`evidence-dot ${item.evidenceLevel}`} /><p><strong>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</strong><small>{subject.shortName} · {statusLabel[item.evidenceLevel]}</small></p><div className="evidence-numbers"><b>{item.focusedMinutes}m<small>focus</small></b><b>{item.attempted ? `${item.accuracy}%` : "—"}<small>accuracy</small></b><b>{item.openMistakes}<small>open gaps</small></b><b>{item.resources}<small>resources</small></b></div><button onClick={() => onOpenResources?.(chapter.id)} aria-label={`Open resources for ${chapter.title}`}><ArrowRight /></button></article>; })}</div></section>;
}

function ChartIcon() { return <BookOpen size={22} />; }

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

export function ResourceLibrary({ resources, chapters, initialChapterId, save, remove }: { resources: StudyResource[]; chapters: Chapter[]; initialChapterId?: string; save: (resource: StudyResource) => void; remove: (resource: StudyResource) => void }) {
  const initialSubjectId = initialChapterId ? chapters.find((chapter) => chapter.id === initialChapterId)?.subjectId ?? "all" : "all";
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [chapterId, setChapterId] = useState(initialChapterId ?? "all");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ResourceKind>("question-bank");
  const [note, setNote] = useState("");
  const subjectChapters = chapters.filter((chapter) => subjectId === "all" || chapter.subjectId === subjectId);
  const formSubjectId = subjectId === "all" ? subjects[0]?.id ?? "" : subjectId;
  const formChapters = chapters.filter((chapter) => chapter.subjectId === formSubjectId);
  const formChapterId = formChapters.some((chapter) => chapter.id === chapterId) ? chapterId : formChapters[0]?.id ?? "";
  const visible = resources.filter((resource) => (subjectId === "all" || resource.subjectId === subjectId) && (chapterId === "all" || resource.chapterId === chapterId));
  const submit = (event: React.FormEvent) => { event.preventDefault(); const chapter = chapters.find((item) => item.id === formChapterId) ?? formChapters[0]; if (!chapter || !title.trim() || !url.trim()) return; save({ id: crypto.randomUUID(), subjectId: chapter.subjectId, chapterId: chapter.id, title: title.trim(), url: url.trim(), kind, note: note.trim() || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); setTitle(""); setUrl(""); setNote(""); setAdding(false); };
  return <main id="main-content" tabIndex={-1} className="page resources-page"><SectionTitle kicker="ONE CURATED PLACE PER CHAPTER" title="Resource library"><button className="accent" onClick={() => setAdding(!adding)}>{adding ? <X /> : <Plus />}{adding ? "Close" : "Add resource"}</button></SectionTitle>{adding && <form className="panel resource-form" onSubmit={submit}><div className="feature-heading"><div><small>CURATE, DON&apos;T COLLECT</small><h3>Add a chapter resource</h3></div><BookOpen /></div><div className="form-row"><label>Subject<select value={formSubjectId} onChange={(event) => { const nextSubject = event.target.value; setSubjectId(nextSubject); setChapterId(chapters.find((chapter) => chapter.subjectId === nextSubject)?.id ?? "all"); }}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={formChapterId} onChange={(event) => setChapterId(event.target.value)}>{formChapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label></div><div className="form-row"><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chapter 9 CQ bank" /></label><label>URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label></div><div className="form-row"><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as ResourceKind)}>{resourceKinds.map((item) => <option value={item} key={item}>{resourceKindLabel[item]}</option>)}</select></label><label>Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this is worth opening" /></label></div><button className="solid-cta"><Plus />Save resource</button></form>}<section className="resource-controls"><label>Subject<select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setChapterId("all"); }}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.shortName}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}><option value="all">All chapters</option>{subjectChapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><span>{visible.length} saved resource{visible.length === 1 ? "" : "s"}</span></section><section className="resource-grid">{visible.length ? visible.map((resource) => <article className="resource-card" key={resource.id}><div className="resource-icon"><LinkSimple /></div><div><small>{resourceKindLabel[resource.kind]} · {bySubject(resource.subjectId).shortName}</small><h3>{resource.title}</h3><p>{byChapter(resource.chapterId, chapters).title}</p>{resource.note && <em>{resource.note}</em>}</div><div className="resource-actions"><a href={resource.url} target="_blank" rel="noreferrer"><ArrowRight />Open</a><button onClick={() => remove(resource)} aria-label={`Delete ${resource.title}`}><Trash /></button></div></article>) : <div className="empty"><Books /><h3>Your resource shelf is empty.</h3><p>Keep only the textbook, question bank, video, or note you are actually going to use.</p><button className="solid-cta" onClick={() => setAdding(true)}><Plus />Add the first resource</button></div>}</section></main>;
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) { return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{children}</div>; }
