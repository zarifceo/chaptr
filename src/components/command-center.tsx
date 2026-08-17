"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise, ArrowRight, BookOpen, Books, Brain, CalendarBlank, CalendarPlus, CaretDown, CaretLeft, CaretRight,
  ChartBar, Check, CheckCircle, Clock, CloudCheck, Exam, Headphones, House,
  EyeSlash, ListChecks, MagnifyingGlass, NotePencil, Pause, Play, Plus, PushPin, Rows,
  Sigma, SignOut, SlidersHorizontal, Sparkle, Target, Timer, Warning, X,
} from "@phosphor-icons/react";
import {
  chapters, marksDistributions, subjects, workflowSteps, replaceAcademicData,
} from "@/lib/academic-data";
import { queueCloudSync } from "@/lib/offline-sync";
import { Button } from "@/components/ui/button";
import { recommendTasks } from "@/lib/recommendations";
import { buildAdaptivePlan, revisionDelayDays } from "@/lib/adaptive-planner";
import { StudyAnalytics, SyllabusEvidenceMap, ExamModeFocus, ResourceLibrary } from "@/components/study-features";
import { AuthScreen } from "@/components/auth-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ExamCountdownCenter } from "@/components/exam-countdown";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { AdaptivePlanSummary, Chapter, ChapterPreference, ExamEvent, JournalEntry, LearningMethod, LearningPreferences, MarksDistribution, Mistake, MockResult, PlanningSettings, RecommendationFeedback, StudyResource, StudySession, StudyTask, Subject, SubjectAssessment, UserProfile } from "@/lib/types";

const nav = [
  ["Home", House], ["Syllabus", Books],
  ["Goals", Target], ["Calendar", CalendarPlus], ["Journal", NotePencil], ["Progress", ChartBar], ["Maths Lab", Sigma],
  ["Exam Mode", Exam], ["Resources", BookOpen], ["Countdown", Timer], ["Exam Plan", Exam], ["Settings", SlidersHorizontal],
] as const;

const bySubject = (id: string) => subjects.find((subject) => subject.id === id)!;
const byChapter = (id: string, list = chapters) => list.find((chapter) => chapter.id === id)!;
const taskById = (tasks: StudyTask[], id: string) => tasks.find((task) => task.id === id);
const subjectAccent: Record<string, Subject["accent"]> = { "bangla-1": "pink", "bangla-2": "yellow", "english-1": "blue", "english-2": "blue", mathematics: "lilac", science: "mint", islam: "yellow", ict: "blue", business: "pink", finance: "mint", accounting: "yellow", agriculture: "mint" };
const officialTotalFor = (subjectId: string) => marksDistributions.filter((mark) => mark.subjectId === subjectId).reduce((sum, mark) => sum + mark.marks, 0);
const workflowForMethod: Record<LearningMethod, string[]> = { "online-class": ["Watch the lesson", "Write a short recall summary", "Answer five questions", "Log the gap"], textbook: ["Read the selected section", "Close the book and recall", "Answer five questions", "Log the gap"], guidebook: ["Study the worked example", "Solve a similar problem", "Check without help", "Log the gap"], "question-bank": ["Attempt a timed set", "Mark every uncertain answer", "Review the solution", "Log the gap"], video: ["Watch the focused explanation", "Pause and retrieve the key idea", "Try a short practice set", "Log the gap"], notes: ["Review your notes", "Recall without looking", "Write the missing detail", "Log the gap"], tutor: ["Review the teacher target", "Attempt the guided example", "Try one independently", "Log the gap"], "group-study": ["Explain the idea aloud", "Compare with a friend", "Attempt a short set", "Log the gap"], flashcards: ["Run a recall round", "Separate uncertain cards", "Practise the weak cards", "Log the gap"] };

const currentMonthKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit" }).format(new Date()) + "-01";
const preferenceFor = (chapterId: string, list: ChapterPreference[]) => list.find((item) => item.chapterId === chapterId) ?? { chapterId, includedForSsc: false, excluded: false, priority: 3 as const };
const monthLabel = (month: string) => new Date(`${month}T00:00:00+06:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
const plannedDate = (task: StudyTask) => task.plannedStart?.slice(0, 10);
const scheduleOn = (task: StudyTask, date: string) => {
  const match = task.plannedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hour = 15;
  let minute = "00";
  if (match) {
    hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    minute = match[2];
  }
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:${minute}:00+06:00`);
  return { ...task, plannedStart: start.toISOString(), plannedEnd: new Date(start.getTime() + task.duration * 60000).toISOString() };
};

function dhakaDate() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
}

function dhakaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function dhakaDateAfter(days: number) {
  return dhakaDateKey(new Date(Date.now() + days * 86400000));
}

function isTaskAvailable(task: StudyTask) {
  return !task.deferredUntil || new Date(task.deferredUntil).getTime() <= Date.now();
}

function taskRow(task: StudyTask) {
  const match = task.plannedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let plannedStart: string | null = task.plannedStart ?? null;
  let plannedEnd: string | null = task.plannedEnd ?? null;
  if (!plannedStart && match) {
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const start = new Date(`${day}T${String(hour).padStart(2, "0")}:${match[2]}:00+06:00`);
    plannedStart = start.toISOString();
    plannedEnd = new Date(start.getTime() + task.duration * 60000).toISOString();
  }
  return {
    id: task.id, subject_id: task.subjectId, chapter_id: task.chapterId, title: task.title,
    origin: task.origin, pinned: task.pinned ?? false, duration_minutes: task.duration,
    priority_score: task.priorityScore, priority_explanation: task.reason, status: task.status,
    current_step: task.currentStep, focused_seconds: task.focusedSeconds ?? 0, planned_start: plannedStart, planned_end: plannedEnd,
    deferred_until: task.deferredUntil ?? null,
    study_method: task.studyMethod ?? null,
    recommendation_factors: task.recommendationFactors ?? {},
  };
}

function chapterRow(chapter: Chapter) {
  return {
    id: `progress-${chapter.id}`, chapter_id: chapter.id, status: chapter.status,
    confidence: chapter.confidence, last_studied: chapter.lastStudied ?? null,
    next_review: chapter.nextReview ?? null, questions_attempted: chapter.questionsAttempted,
    questions_correct: chapter.questionsCorrect,
  };
}

function preferenceRow(preference: ChapterPreference) {
  return {
    chapter_id: preference.chapterId,
    included_for_ssc: preference.includedForSsc,
    target_month: preference.targetMonth ?? null,
    excluded: preference.excluded,
    exclusion_reason: preference.exclusionReason ?? null,
    priority: preference.priority,
  };
}

function journalRow(entry: JournalEntry) {
  return {
    id: entry.id, task_id: entry.taskId || null, subject_id: entry.subjectId, chapter_id: entry.chapterId, learning_goal: entry.learningGoal, resources: entry.resources, minutes: entry.minutes, attempted: entry.attempted, correct: entry.correct, confidence_before: entry.confidenceBefore,
    confidence_after: entry.confidenceAfter, mistakes_text: entry.mistakesText ?? null,
    written_score: entry.writtenScore ?? null, reflection: entry.reflection,
    next_action: entry.nextAction, created_at: entry.createdAt,
  };
}

function mistakeRow(mistake: Mistake, subjectId = "mathematics") {
  return {
    id: mistake.id, subject_id: subjectId, chapter_id: mistake.chapterId, prompt: mistake.prompt,
    error_type: mistake.errorType, reattempt_date: mistake.reattemptDate || null, resolved: mistake.resolved,
    resolved_at: mistake.resolved ? mistake.lastAttemptedAt ?? new Date().toISOString() : null,
    revision_count: mistake.revisionCount ?? 0, last_attempted_at: mistake.lastAttemptedAt ?? null,
    last_attempt_note: mistake.lastAttemptNote ?? null,
  };
}

function sessionRow(session: StudySession) {
  return { id: session.id, task_id: session.taskId, subject_id: session.subjectId, chapter_id: session.chapterId, mode: session.mode, started_at: session.startedAt, ended_at: session.endedAt ?? null, focused_seconds: session.focusedSeconds, pause_seconds: session.pauseSeconds, completed: session.completed, questions_attempted: session.questionsAttempted ?? null, questions_correct: session.questionsCorrect ?? null };
}

function resourceRow(resource: StudyResource) {
  return { id: resource.id, subject_id: resource.subjectId, chapter_id: resource.chapterId, title: resource.title, url: resource.url, kind: resource.kind, note: resource.note ?? null, archived: resource.archived ?? false, created_at: resource.createdAt, updated_at: resource.updatedAt };
}

function examEventRow(event: ExamEvent) {
  return { id: event.id, name: event.name, starts_on: event.start, ends_on: event.end, kind: event.kind, scope: event.scope, note: event.note ?? null, locked: event.locked ?? false, archived: event.archived ?? false };
}

function planningRow(settings: PlanningSettings) {
  return { main_start: settings.mainStart, main_end: settings.mainEnd, math_start: settings.mathStart, math_end: settings.mathEnd, daily_target: settings.dailyTarget, math_days_per_week: settings.mathDaysPerWeek, agriculture_days_per_week: settings.agricultureDaysPerWeek, reminders_enabled: settings.remindersEnabled };
}

function adaptivePlanRow(summary: AdaptivePlanSummary) {
  return { used_minutes: summary.usedMinutes, available_minutes: summary.availableMinutes, deferred_count: summary.deferredCount, generated_revision_count: summary.generatedRevisionCount, rationale: summary.rationale, planned_at: summary.plannedAt };
}

function learningPreferencesRow(value: Partial<LearningPreferences>) {
  return {
    preferred_methods: value.preferredMethods,
    preferred_resource_kinds: value.preferredResourceKinds,
    session_length_minutes: value.sessionLengthMinutes,
    sessions_per_day: value.sessionsPerDay,
    available_days: value.availableDays,
    weekday_minutes: value.weekdayMinutes,
    weekend_minutes: value.weekendMinutes,
    target_grade: value.targetGrade,
    guidance_mode: value.guidanceMode,
    plan_strictness: value.planStrictness,
    instruction_ratio: value.instructionRatio,
    practice_ratio: value.practiceRatio,
    review_ratio: value.reviewRatio,
  };
}

function subjectAssessmentRow(value: SubjectAssessment) {
  return { subject_id: value.subjectId, difficulty: value.difficulty, confidence: value.confidence, priority: value.priority, starting_point: value.startingPoint, preferred_methods: value.preferredMethods };
}

function feedbackRow(value: RecommendationFeedback) {
  return { id: value.id, task_id: value.taskId ?? null, subject_id: value.subjectId ?? null, chapter_id: value.chapterId ?? null, feedback_type: value.feedbackType, method: value.method ?? null, note: value.note ?? null, created_at: value.createdAt ?? new Date().toISOString() };
}

function Sidebar({ active, setActive, open, close }: { active: string; setActive: (value: string) => void; open: boolean; close: () => void }) {
  return <aside id="app-navigation" className={`sidebar ${open ? "is-open" : ""}`} aria-label="Primary navigation">
    <button className="close-menu" onClick={close} aria-label="Close navigation"><X /></button>
    <button className="brand" onClick={() => { setActive("Home"); close(); }}>
      <Image src="/icon-512.png" width={44} height={44} alt="SSC Command Center" priority />
      <div><strong>SSC</strong><small>Command Center</small></div>
    </button>
    <nav>{nav.map(([label, Icon]) => <Button key={label} variant={active === label ? "secondary" : "ghost"} size="sm" className={`sidebar-nav-button ${active === label ? "active" : ""}`} aria-current={active === label ? "page" : undefined} onClick={() => { setActive(label); close(); }}><Icon size={21} weight={active === label ? "fill" : "regular"} /><span>{label}</span></Button>)}</nav>
    <div className="sync-pill"><CloudCheck size={20} weight="fill" /><span><strong>Database connected</strong><small>Supabase-only workspace</small></span></div>
  </aside>;
}

function Topbar({ active, open, expanded, profile }: { active: string; open: () => void; expanded: boolean; profile: UserProfile }) {
  const initials = (profile.displayName || "Student").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <header className="topbar">
    <button className="menu-button" onClick={open} aria-label="Open navigation" aria-controls="app-navigation" aria-expanded={expanded}><Rows size={23} weight="bold" /></button>
    <div><p>{dhakaDate()}</p><h1>{active}</h1></div>
    <div className="profile"><span>{initials}</span><div><strong>{profile.displayName || "Student"}</strong><small>SSC {profile.examYear}</small></div></div>
  </header>;
}

function Countdown({ name, date, tone }: { name: string; date: string; tone: string }) {
  const target = new Date(`${date}T00:00:00+06:00`).getTime();
  const [now] = useState(() => Date.now());
  const days = Math.max(0, Math.ceil((target - now) / 86400000));
  return <article className={`countdown ${tone}`}><CalendarBlank /><div><small>{name}</small><strong>{days}<em> days</em></strong><span>Starts {new Date(`${date}T00:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })}</span></div></article>;
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{children}</div>;
}

function Dashboard({ tasks, chapters, preferences, mistakes, entries, examEvents, go }: { tasks: StudyTask[]; chapters: Chapter[]; preferences: ChapterPreference[]; mistakes: Mistake[]; entries: JournalEntry[]; examEvents: ExamEvent[]; go: (value: string) => void }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const first = visible[0];
  if (!first) return <section className="dashboard-page home-section"><section className="empty-dashboard-grid"><article className="panel empty-dashboard-card"><div className="empty-illustration"><CalendarBlank /></div><div><small>READY WHEN YOU ARE</small><h2>Start with one clear study action.</h2><p>Your syllabus is loaded. Choose a chapter or add a task to begin today&apos;s work.</p><div className="empty-actions"><Button size="lg" className="solid-cta" onClick={() => go("Home")}>Open Home</Button><Button size="lg" variant="outline" onClick={() => go("Goals")}>Set chapter goals</Button></div></div></article><aside className="panel setup-checklist"><small>FIRST 3 MOVES</small><h3>A simple way to begin.</h3><ol><li>Choose the chapters you will cover for SSC.</li><li>Add a focused task to today&apos;s timeline.</li><li>Write a short journal entry when you finish.</li></ol></aside></section></section>;
  const subject = bySubject(first.subjectId);
  const chapter = byChapter(first.chapterId);
  const readiness = (subjectId: string) => { const mine = chapters.filter((item) => item.subjectId === subjectId); return mine.length ? Math.round(mine.reduce((sum, item) => sum + item.confidence, 0) / (mine.length * 5) * 100) : 0; };
  const writtenPractice = Math.min(100, entries.filter((entry) => ["bangla-1", "bangla-2", "accounting"].includes(entry.subjectId)).length * 12);
  const strongIds = subjects.filter((item) => item.strength === "strongest" || item.strength === "very-strong").map((item) => item.id);
  const strongReadiness = Math.round(strongIds.reduce((sum, id) => sum + readiness(id), 0) / strongIds.length);
  const weeklyBars: [string, number, string][] = [["Mathematics", readiness("mathematics"), "lilac"], ["Agriculture", readiness("agriculture"), "mint"], ["Written practice", writtenPractice, "pink"], ["Strong subjects", strongReadiness, "yellow"]];
  const openMaths = mistakes.filter((item) => !item.resolved).length;
  return <section className="dashboard-page home-section">
    <section className="hero-grid">
      <article className="priority-hero">
        <div className="eyebrow"><Sparkle weight="fill" />BEST NEXT MOVE</div>
        <h2>{subject.shortName}</h2>
        <p>{chapter.number ? `Chapter ${chapter.number} · ` : ""}{chapter.title}</p>
        <div className="chips"><span>{first.reason.split(" · ")[0]}</span><span>{first.priorityScore} priority</span><span>{first.duration} min</span></div>
        <Button size="lg" className="solid-cta" onClick={() => go("Home")}><Play weight="fill" />Start study flow</Button>
        <Brain className="hero-art" weight="duotone" />
      </article>
      <div className="countdown-stack">{examEvents.length ? examEvents.slice(0, 2).map((event, index) => <Countdown key={event.id} name={event.name} date={event.start} tone={index === 0 ? "lilac" : "mint"} />) : <article className="panel empty compact"><Timer /><p>No exam events yet. Add one in Countdown.</p></article>}</div>
    </section>
    <section className="strategy-ribbon"><button onClick={() => go("Goals")}><Target weight="fill" /><span><small>SSC STRATEGY</small><strong>{preferences.filter((item) => item.includedForSsc && !item.excluded).length} selected</strong></span><CaretRight /></button><button onClick={() => go("Goals")}><CalendarPlus weight="fill" /><span><small>{monthLabel(currentMonthKey()).toUpperCase()}</small><strong>{preferences.filter((item) => item.targetMonth === currentMonthKey() && !item.excluded).length} chapter goals</strong></span><CaretRight /></button><button onClick={() => go("Syllabus")}><EyeSlash weight="fill" /><span><small>STRATEGICALLY SKIPPED</small><strong>{preferences.filter((item) => item.excluded).length} excluded</strong></span><CaretRight /></button><button onClick={() => go("Countdown")}><Timer weight="fill" /><span><small>NEXT DEADLINE</small><strong>{examEvents.find((event) => event.id === "ssc")?.name ?? "Exam countdown"}</strong></span><CaretRight /></button></section>
    <section className="dashboard-grid">
      <article className="panel weekly"><SectionTitle kicker="LIVE EVIDENCE" title="Work that protects your result" /><div className="bars">{weeklyBars.map(([label, value, tone]) => <div key={label}><span>{label}</span><i><b className={tone} style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>)}</div></article>
      <article className="panel risks"><SectionTitle kicker="URGENT" title="Repair queue"><Warning weight="fill" /></SectionTitle>{[["Maths", `${openMaths} open mistake${openMaths === 1 ? "" : "s"} need reattempts`, "lilac"], ["Agriculture", `${readiness("agriculture")}% readiness · deliberate exposure`, "mint"], ["Accounting", `${readiness("accounting")}% readiness · concepts plus practice`, "yellow"]].map(([name, note, tone]) => <button key={name} onClick={() => go(name === "Maths" ? "Maths Lab" : "Syllabus")}><i className={tone} /><span><strong>{name}</strong><small>{note}</small></span><CaretRight /></button>)}</article>
    </section>
    <section className="panel queue"><SectionTitle kicker="TODAY" title="Recommended queue"><button onClick={() => go("Home")}>Open full day <ArrowRight /></button></SectionTitle>{visible.slice(0, 4).map((task, index) => <div key={task.id}><span className={`number ${bySubject(task.subjectId).accent}`}>{index + 1}</span><p><strong>{bySubject(task.subjectId).shortName}</strong><small>{task.title}</small></p><time>{task.plannedTime}</time><b>{task.duration}m</b></div>)}</section>
  </section>;
}

function StudyStep({ name, index, current, onAdvance }: { name: string; index: number; current: number; onAdvance: () => void }) {
  const icons = [Play, Headphones, Rows, NotePencil, BookOpen, Timer, ListChecks];
  const Icon = icons[index % icons.length];
  const done = index < current;
  return <div className={`study-step ${done ? "complete" : index === current ? "current" : "later"}`}>
    <span className="node">{done && <Check weight="bold" />}</span><span className="step-icon"><Icon /></span>
    <p><strong>{name}</strong>{index === current && <small>Current step</small>}</p>
    {done ? <em>Done <CheckCircle weight="fill" /></em> : index === current ? <button onClick={onAdvance}>Complete & continue <CaretRight /></button> : <em>Later</em>}
  </div>;
}

function FocusTimer({ seconds, onChange }: { seconds: number; onChange: (seconds: number) => void }) {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => onChange(seconds + 1), 1000);
    return () => window.clearInterval(id);
  }, [onChange, running, seconds]);
  const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="timer-box"><Timer /><strong>{label}</strong><button className="primary" onClick={() => setRunning(!running)}>{running ? <><Pause weight="fill" />Pause</> : <><Play weight="fill" />Focus</>}</button><button onClick={() => { setRunning(false); onChange(0); }}>Reset</button></div>;
}

function AdaptivePlannerControls({ summary, run }: { summary: AdaptivePlanSummary | null; run: (minutes: number) => void }) {
  const [minutes, setMinutes] = useState(summary?.availableMinutes ?? 240);
  return <article className="panel adaptive-planner"><div><small className="eyebrow">ADAPTIVE DAILY PLANNER</small><h3>Plan today around the gaps.</h3><p>Review open mistakes first, then schedule the next useful chapter.</p>{summary?.rationale.map((line) => <small className="planner-note" key={line}>{line}</small>)}</div><div className="adaptive-planner-actions"><label>Available minutes<input type="number" min="15" max="600" step="15" value={minutes} onChange={(event) => setMinutes(Math.max(15, Math.min(600, Number(event.target.value))))} /></label><button className="accent" onClick={() => run(minutes)}><Sparkle weight="fill" />Adapt my day</button>{summary && <span className="planner-result" role="status">{summary.usedMinutes}/{summary.availableMinutes} min placed · {summary.deferredCount} deferred</span>}</div></article>;
}

function Today({ tasks, preferences, update, remove, journal, add, focusTaskId, planSummary, planToday, examEvents, feedback, adaptiveRiskSubject }: { tasks: StudyTask[]; preferences: ChapterPreference[]; update: (task: StudyTask) => void; remove: (task: StudyTask) => void; journal: (task: StudyTask) => void; add: () => void; focusTaskId?: string | null; planSummary: AdaptivePlanSummary | null; planToday: (minutes: number) => void; examEvents: ExamEvent[]; feedback: (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => void; adaptiveRiskSubject: string }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const nextExam = [...examEvents].sort((a, b) => a.start.localeCompare(b.start))[0];
  const [expanded, setExpanded] = useState(focusTaskId ?? visible[0]?.id ?? "");
  const advance = (task: StudyTask, total: number) => {
    if (task.currentStep + 1 >= total) return journal(task);
    update({ ...task, currentStep: task.currentStep + 1, status: "in-progress" });
  };
  return <section className="today-page home-section">
    <section className="journey">
      <SectionTitle kicker="YOUR PLAN ADAPTS — NO PUNISHMENT FOR MISSED DAYS" title="Study timeline"><button className="add-task" onClick={add}><Plus />Add task</button></SectionTitle>
      <AdaptivePlannerControls summary={planSummary} run={planToday} />
      <div className="timeline">{visible.length ? visible.map((task, index) => {
        const subject = bySubject(task.subjectId);
        const steps = [...(task.studyMethod ? workflowForMethod[task.studyMethod] : workflowSteps[subject.workflow] ?? workflowForMethod.textbook)];
        const open = expanded === task.id;
        return <article className={`timeline-task ${subject.accent} ${open ? "open" : ""}`} key={task.id}>
          <time>{task.plannedTime}</time><span className="timeline-rail"><i /></span>
          <div className="task-card">
            <div className="task-heading"><button className="task-summary" onClick={() => setExpanded(open ? "" : task.id)}><span className="subject-token">{subject.shortName.slice(0, 2)}</span><p><small>{index + 1}. {subject.shortName}{task.pinned ? " · PINNED" : ""}</small><strong>{task.title}</strong><em>{task.reason} · {task.duration} min</em></p><CaretDown /></button><button className="remove-today" onClick={() => remove(task)} aria-label={`Remove ${task.title} from today's timeline`} title="Remove from today"><X /></button></div>
            {open && <div className="steps">
              <FocusTimer seconds={task.focusedSeconds ?? 0} onChange={(focusedSeconds) => update({ ...task, focusedSeconds, status: focusedSeconds ? "in-progress" : task.status })} />
              <div className="task-actions"><button className={task.pinned ? "pinned" : ""} onClick={() => update({ ...task, pinned: !task.pinned, priorityScore: task.pinned ? task.priorityScore : 100 })}><PushPin weight={task.pinned ? "fill" : "regular"} />{task.pinned ? "Pinned" : "Pin first"}</button><label><span className="sr-only">Study time</span><input value={task.plannedTime} onChange={(event) => update({ ...task, plannedTime: event.target.value })} aria-label="Study time" /></label><button onClick={() => update({ ...task, status: "planned", plannedTime: "Tomorrow", deferredUntil: new Date(Date.now() + 86400000).toISOString() })}>Move to tomorrow</button></div><div className="recommendation-feedback"><small>Was this a useful next step?</small><button onClick={() => feedback(task, "useful")}>Useful</button><button onClick={() => feedback(task, "too-hard")}>Too hard</button><button onClick={() => feedback(task, "too-easy")}>Too easy</button><button onClick={() => feedback(task, "not-today")}>Not today</button></div>
              {steps.map((name, step) => <StudyStep key={name} name={name} index={step} current={task.currentStep} onAdvance={() => advance(task, steps.length)} />)}
              <button className="finish" onClick={() => journal(task)}><NotePencil />Finish with journal</button>
            </div>}
          </div>
        </article>;
      }) : <article className="empty-day"><CheckCircle weight="fill" /><h3>Today&apos;s open queue is clear.</h3><p>Add a manual task or let tomorrow&apos;s recommendations refill it.</p><button className="solid-cta" onClick={add}><Plus />Add a task</button></article>}</div>
    </section>
    <aside className="today-aside">{nextExam ? <Countdown name={nextExam.name} date={nextExam.start} tone="lilac" /> : <article className="mini-card"><small>NEXT EXAM</small><p>No exam event has been configured yet.</p></article>}<article className="mini-card"><small>TODAY&apos;S TARGET</small><h3>{visible.reduce((sum, task) => sum + task.duration, 0)}<em> min</em><b>{tasks.length ? Math.round(tasks.filter((task) => task.status === "completed").length / tasks.length * 100) : 0}%</b></h3><i className="meter" /></article><article className="mini-card risk"><small>PERSONAL RISK INSIGHT</small><h3>{adaptiveRiskSubject} needs attention.</h3><p>Your difficulty and priority signals are shaping the next recommendation.</p></article><article className="mini-card"><small>WHY THESE TASKS?</small><p>30% urgency · 25% weakness · 20% mastery · 15% review · 10% evidence</p></article></aside>
  </section>;
}

function Home({ tasks, chapters, preferences, mistakes, entries, examEvents, update, remove, journal, add, focusTaskId, planSummary, planToday, go, feedback, adaptiveRiskSubject }: { tasks: StudyTask[]; chapters: Chapter[]; preferences: ChapterPreference[]; mistakes: Mistake[]; entries: JournalEntry[]; examEvents: ExamEvent[]; update: (task: StudyTask) => void; remove: (task: StudyTask) => void; journal: (task: StudyTask) => void; add: () => void; focusTaskId?: string | null; planSummary: AdaptivePlanSummary | null; planToday: (minutes: number) => void; go: (value: string) => void; feedback: (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => void; adaptiveRiskSubject: string }) {
  return <main id="main-content" tabIndex={-1} className="page home-page"><Dashboard tasks={tasks} chapters={chapters} preferences={preferences} mistakes={mistakes} entries={entries} examEvents={examEvents} go={go} /><Today tasks={tasks} preferences={preferences} update={update} remove={remove} journal={journal} add={add} focusTaskId={focusTaskId} planSummary={planSummary} planToday={planToday} examEvents={examEvents} feedback={feedback} adaptiveRiskSubject={adaptiveRiskSubject} /></main>;
}

function Syllabus({ list, setList, preferences, updatePreference, completeChapter, persistProgress, goGoals, sessions, entries, mistakes, resources, goResources }: { list: Chapter[]; setList: (value: Chapter[]) => void; preferences: ChapterPreference[]; updatePreference: (value: ChapterPreference) => void; completeChapter: (chapter: Chapter) => void; persistProgress: (chapter: Chapter) => void; goGoals: () => void; sessions: StudySession[]; entries: JournalEntry[]; mistakes: Mistake[]; resources: StudyResource[]; goResources: (chapterId: string) => void }) {
  const [selected, setSelected] = useState("mathematics");
  const [query, setQuery] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const subject = bySubject(selected);
  const mine = list.filter((chapter) => chapter.subjectId === selected && chapter.title.toLowerCase().includes(query.toLowerCase()) && (showExcluded || !preferenceFor(chapter.id, preferences).excluded));
  const marks = marksDistributions.filter((mark) => mark.subjectId === selected);
  const cycle = (chapter: Chapter) => {
    const states: Chapter["status"][] = ["not-started", "learning", "practising", "exam-ready", "needs-revision"];
    const updated = { ...chapter, status: states[(states.indexOf(chapter.status) + 1) % states.length] };
    setList(list.map((item) => item.id === chapter.id ? updated : item));
    persistProgress(updated);
  };
  const setConfidence = (chapter: Chapter, confidence: Chapter["confidence"]) => {
    const updated = { ...chapter, confidence };
    setList(list.map((item) => item.id === chapter.id ? updated : item));
    persistProgress(updated);
  };
  const listedTotal = marks.reduce((sum, item) => sum + item.marks, 0);
  const officialTotal = officialTotalFor(selected) || undefined;
  const hasConflict = Boolean(officialTotal && listedTotal && listedTotal !== officialTotal);
  return <main id="main-content" tabIndex={-1} className="page syllabus-page">
    <section className="subject-strip" aria-label="Subjects">{subjects.map((item) => <button key={item.id} className={selected === item.id ? `active ${item.accent}` : ""} onClick={() => setSelected(item.id)}><span>{item.shortName.slice(0, 2)}</span><strong>{item.shortName}</strong><small>{list.filter((chapter) => chapter.subjectId === item.id).length} topics</small></button>)}</section>
    <section className="syllabus-layout"><div><SectionTitle kicker={`${subject.strength.replace("-", " ")} · ${subject.workflow === "accounting" ? "separate accounting workflow" : subject.workflow}`} title={subject.name}><div className="syllabus-tools"><label className="search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a chapter" aria-label="Find a chapter" /></label><button className={showExcluded ? "active" : ""} onClick={() => setShowExcluded(!showExcluded)}><EyeSlash />{showExcluded ? "Hide excluded" : "Show excluded"}</button><button onClick={goGoals}><Target />Plan goals</button></div></SectionTitle><div className="chapters">{mine.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); return <article className={preference.excluded ? "excluded" : ""} key={chapter.id}><span className={`number ${subject.accent}`}>{chapter.number ?? "•"}</span><p><strong>{chapter.title}</strong><small>{preference.excluded ? `Excluded${preference.exclusionReason ? ` · ${preference.exclusionReason}` : ""}` : [chapter.division, chapter.note].filter(Boolean).join(" · ") || chapter.formats.join(" · ")}</small></p><div className="chapter-actions"><button className={preference.targetMonth === currentMonthKey() ? "selected" : ""} onClick={() => updatePreference({ ...preference, excluded: false, targetMonth: preference.targetMonth === currentMonthKey() ? undefined : currentMonthKey() })}>Month</button><button className={preference.includedForSsc ? "selected" : ""} onClick={() => updatePreference({ ...preference, excluded: false, includedForSsc: !preference.includedForSsc })}>SSC</button><button className={preference.excluded ? "danger selected" : "danger"} onClick={() => updatePreference({ ...preference, excluded: !preference.excluded, includedForSsc: preference.excluded ? preference.includedForSsc : false, targetMonth: preference.excluded ? preference.targetMonth : undefined, exclusionReason: preference.excluded ? undefined : "Strategic skip" })} aria-label={preference.excluded ? `Restore ${chapter.title}` : `Exclude ${chapter.title}`}>{preference.excluded ? <ArrowCounterClockwise /> : <EyeSlash />}</button></div><div className="chapter-status-actions"><button className={`status ${chapter.status}`} onClick={() => cycle(chapter)} aria-label={`Change status for ${chapter.title}`}>{chapter.status === "exam-ready" ? "Complete" : chapter.status.replace("-", " ")}</button><button className="complete-chapter" onClick={() => completeChapter(chapter)} disabled={chapter.status === "exam-ready"} aria-label={`${chapter.status === "exam-ready" ? "Completed" : "Mark"} ${chapter.title} complete`}>{chapter.status === "exam-ready" ? <><CheckCircle weight="fill" />Completed</> : <><Check />Mark complete</>}</button></div><span className="confidence" role="group" aria-label={`Confidence for ${chapter.title}`}>{([1, 2, 3, 4, 5] as const).map((n) => <button type="button" className={n <= chapter.confidence ? "on" : ""} key={n} onClick={() => setConfidence(chapter, n)} aria-label={`Set confidence to ${n} out of 5`} aria-pressed={chapter.confidence === n} />)}</span></article>; })}</div></div><aside className="marks"><small>OFFICIAL QUESTION-TYPE DISTRIBUTION</small><h3>{officialTotal ? `${officialTotal} marks` : marks.length ? `${listedTotal} marks listed` : "Pattern pending"}</h3>{hasConflict && <p className="source-warning"><Warning weight="fill" />The source says {officialTotal} total, while its listed rows add to {listedTotal}. Kept visible for confirmation; no chapter marks were invented.</p>}{marks.length ? marks.map((mark) => <div key={`${mark.part}-${mark.questionType}`}><p><strong>{mark.questionType}</strong><small>{mark.rule}</small></p><b>{mark.marks}</b></div>) : <p>No complete readable Agriculture marks table was available. No chapter weights have been invented.</p>}</aside></section><SyllabusEvidenceMap chapters={list} sessions={sessions} entries={entries} mistakes={mistakes} resources={resources} onOpenResources={goResources} />
  </main>;
}

function GoalMetrics({ chapters }: { chapters: Chapter[] }) {
  const ready = chapters.filter((chapter) => chapter.status === "exam-ready").length;
  const active = chapters.filter((chapter) => chapter.status !== "not-started" && chapter.status !== "exam-ready").length;
  const left = chapters.filter((chapter) => chapter.status === "not-started").length;
  const percent = chapters.length ? Math.round(ready / chapters.length * 100) : 0;
  return <div className="goal-metrics"><article><small>Selected</small><strong>{chapters.length}</strong></article><article><small>Exam-ready</small><strong>{ready}</strong></article><article><small>In progress</small><strong>{active}</strong></article><article><small>Left</small><strong>{left}</strong></article><article className="wide"><small>Completion</small><i><b style={{ width: `${percent}%` }} /></i><strong>{percent}%</strong></article></div>;
}

function Goals({ list, preferences, updatePreference, updatePreferences, completeChapter, buildQueue }: { list: Chapter[]; preferences: ChapterPreference[]; updatePreference: (value: ChapterPreference) => void; updatePreferences: (values: ChapterPreference[]) => void; completeChapter: (chapter: Chapter) => void; buildQueue: (chapters: Chapter[], label: string) => void }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [subjectId, setSubjectId] = useState("all");
  const [mode, setMode] = useState<"monthly" | "ssc" | "excluded">("ssc");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const monthly = list.filter((chapter) => preferenceFor(chapter.id, preferences).targetMonth === month && !preferenceFor(chapter.id, preferences).excluded);
  const ssc = list.filter((chapter) => preferenceFor(chapter.id, preferences).includedForSsc && !preferenceFor(chapter.id, preferences).excluded);
  const excluded = list.filter((chapter) => preferenceFor(chapter.id, preferences).excluded);
  const selected = mode === "monthly" ? monthly : mode === "ssc" ? ssc : excluded;
  const candidates = list.filter((chapter) => subjectId === "all" || chapter.subjectId === subjectId);
  const deadline = mode === "monthly" ? new Date(new Date(`${month}T00:00:00+06:00`).getFullYear(), new Date(`${month}T00:00:00+06:00`).getMonth() + 1, 0) : new Date("2027-01-07T00:00:00+06:00");
  const weeks = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 604800000));
  const remaining = selected.filter((chapter) => chapter.status !== "exam-ready").length;
  const pace = Math.ceil(remaining / weeks);
  const isChosen = (chapter: Chapter) => mode === "monthly" ? preferenceFor(chapter.id, preferences).targetMonth === month : mode === "ssc" ? preferenceFor(chapter.id, preferences).includedForSsc && !preferenceFor(chapter.id, preferences).excluded : preferenceFor(chapter.id, preferences).excluded;
  const updateSelection = (chapter: Chapter, chosen: boolean) => {
    const preference = preferenceFor(chapter.id, preferences);
    if (mode === "monthly") updatePreference({ ...preference, excluded: false, exclusionReason: undefined, targetMonth: chosen ? month : undefined });
    else if (mode === "ssc") updatePreference({ ...preference, excluded: false, exclusionReason: undefined, includedForSsc: chosen });
    else updatePreference({ ...preference, excluded: !chosen, includedForSsc: false, targetMonth: undefined, exclusionReason: chosen ? "Strategic skip" : undefined });
  };
  const toggleSubject = (subjectIdToChange: string) => {
    const group = candidates.filter((chapter) => chapter.subjectId === subjectIdToChange);
    const allChosen = group.length > 0 && group.every(isChosen);
    updatePreferences(group.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); const chosen = !allChosen; if (mode === "monthly") return { ...preference, excluded: false, exclusionReason: undefined, targetMonth: chosen ? month : undefined }; if (mode === "ssc") return { ...preference, excluded: false, exclusionReason: undefined, includedForSsc: chosen }; return { ...preference, excluded: !chosen, includedForSsc: false, targetMonth: undefined, exclusionReason: chosen ? "Strategic skip" : undefined }; }));
  };
  const toggleAll = (chosen: boolean) => updatePreferences(candidates.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); if (mode === "monthly") return { ...preference, excluded: false, exclusionReason: undefined, targetMonth: chosen ? month : undefined }; if (mode === "ssc") return { ...preference, excluded: false, exclusionReason: undefined, includedForSsc: chosen }; return { ...preference, excluded: !chosen, includedForSsc: false, targetMonth: undefined, exclusionReason: chosen ? "Strategic skip" : undefined }; }));
  const subjectGroups = subjects.map((subject) => ({ subject, chapters: candidates.filter((chapter) => chapter.subjectId === subject.id) })).filter((group) => group.chapters.length);
  return <main id="main-content" tabIndex={-1} className="page goals-page">
    <SectionTitle kicker="BUILD THE SYLLABUS YOU WILL ACTUALLY STUDY" title="Strategic chapter goals"><span><Target weight="fill" />{pace} chapter{pace === 1 ? "" : "s"}/week needed</span></SectionTitle>
    <section className="panel goal-intro"><div><small>SSC 2027 TARGET CAMPAIGN</small><h3>{mode === "ssc" ? "Every chapter is included by default." : mode === "monthly" ? `${monthLabel(month)} campaign` : "Your reversible exclusions"}</h3><p>{mode === "ssc" ? "Keep all chapters selected, then exclude only the chapters you deliberately do not want in your plan." : "Use subject sections and bulk actions instead of managing a long undifferentiated list."}</p></div><div className="goal-bulk-actions">{mode !== "excluded" && <button className="accent" onClick={() => toggleAll(true)}><CheckCircle weight="fill" />Select all visible</button>}<button onClick={() => toggleAll(false)}><X />{mode === "excluded" ? "Clear exclusions" : "Clear visible"}</button></div></section>
    <section className="goal-controls"><div className="segmented">{(["monthly", "ssc", "excluded"] as const).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)}>{item === "monthly" ? "Monthly goal" : item === "ssc" ? "Before SSC" : "Excluded"}</button>)}</div>{mode === "monthly" && <label>Target month<input type="month" value={month.slice(0, 7)} onChange={(event) => setMonth(`${event.target.value}-01`)} /></label>}<label>Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label></section>
    <GoalMetrics chapters={selected} />
    <section className="goals-structured"><article className="panel goal-selected"><SectionTitle kicker={mode === "monthly" ? monthLabel(month) : mode === "ssc" ? "SSC 2027 TARGET SET" : "REVERSIBLE STRATEGIC SKIPS"} title={mode === "excluded" ? "Chapters you chose not to prepare" : "Selected chapters"}>{mode !== "excluded" && selected.length > 0 && <button className="accent" onClick={() => buildQueue(selected, mode === "monthly" ? `${monthLabel(month)} goal` : "SSC target")}><ListChecks />Build next 5</button>}</SectionTitle>{selected.length ? subjectGroups.map(({ subject }) => { const mine = selected.filter((chapter) => chapter.subjectId === subject.id); if (!mine.length) return null; return <section className="goal-selected-subject" key={subject.id}><header><span className={`subject-token ${subject.accent}`}>{subject.shortName.slice(0, 2)}</span><div><strong>{subject.name}</strong><small>{mine.length} selected · {mine.filter((chapter) => chapter.status === "exam-ready").length} complete</small></div></header>{mine.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); return <div className="goal-row" key={chapter.id}><span className={`number ${subject.accent}`}>{chapter.number ?? "•"}</span><p><strong>{chapter.title}</strong><small>{chapter.status === "exam-ready" ? "Completed before or during this app" : chapter.status.replace("-", " ")}</small></p>{mode !== "excluded" && <label className="priority-control">Priority<select value={preference.priority} onChange={(event) => updatePreference({ ...preference, priority: Number(event.target.value) as ChapterPreference["priority"] })}>{[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level}</option>)}</select></label>}<button className={chapter.status === "exam-ready" ? "complete-inline is-complete" : "complete-inline"} onClick={() => chapter.status === "exam-ready" ? undefined : completeChapter(chapter)} disabled={chapter.status === "exam-ready"}>{chapter.status === "exam-ready" ? <><CheckCircle weight="fill" />Complete</> : <><Check />Mark complete</>}</button><button className="remove-goal" onClick={() => updateSelection(chapter, false)}>{mode === "excluded" ? <><ArrowCounterClockwise />Restore</> : "Remove from goal"}</button></div>; })}</section>; }) : <div className="empty compact"><Target /><h3>No chapters selected yet.</h3><p>Choose a subject group from the right to add chapters back into this campaign.</p></div>}</article><aside className="panel goal-picker"><SectionTitle kicker="STRUCTURED BY SUBJECT" title="Choose your coverage" />{subjectGroups.map(({ subject, chapters }) => { const chosenCount = chapters.filter(isChosen).length; const allChosen = chapters.length > 0 && chosenCount === chapters.length; return <section className="goal-subject-section" key={subject.id}><header><div><span className={`subject-token ${subject.accent}`}>{subject.shortName.slice(0, 2)}</span><div><strong>{subject.name}</strong><small>{chosenCount}/{chapters.length} {mode === "excluded" ? "excluded" : "selected"}</small></div></div><div className="subject-group-actions"><button type="button" onClick={() => toggleSubject(subject.id)}>{allChosen ? "Clear subject" : "Select subject"}</button><button type="button" className="expand-subject" aria-expanded={expandedSubject === subject.id} aria-controls={`coverage-${subject.id}`} onClick={() => setExpandedSubject((current) => current === subject.id ? null : subject.id)}>{expandedSubject === subject.id ? "Hide chapters" : "View chapters"}<CaretDown weight="bold" /></button></div></header>{expandedSubject === subject.id && <div className="goal-chapter-list" id={`coverage-${subject.id}`}>{chapters.map((chapter) => { const chosen = isChosen(chapter); return <label className={`goal-chapter-option ${chosen ? "chosen" : ""}`} key={chapter.id}><input type="checkbox" checked={chosen} onChange={(event) => updateSelection(chapter, event.target.checked)} /><span><strong>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</strong><small>{chapter.status === "exam-ready" ? "Completed" : chapter.status.replace("-", " ")}</small></span>{chosen ? <CheckCircle weight="fill" /> : <Plus />}</label>; })}</div>}</section>; })}</aside></section>
  </main>;
}

type CalendarHealth = { authenticated: boolean; configured: boolean; connected: boolean; lastSuccessfulSync?: string | null; linkedEvents?: number; missing?: string[] };

function StudyCalendar({ tasks, preferences, update, add, openTask }: { tasks: StudyTask[]; preferences: ChapterPreference[]; update: (task: StudyTask) => void; add: (date?: string) => void; openTask: (task: StudyTask) => void }) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());
  const [health, setHealth] = useState<CalendarHealth | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const activeTasks = tasks.filter((task) => !excluded.has(task.chapterId) && task.status !== "skipped");
  const refreshHealth = async () => {
    const response = await fetch("/api/calendar/status").catch(() => null);
    const next = response?.ok ? await response.json().catch(() => null) as CalendarHealth | null : null;
    setHealth(next);
    return next;
  };
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/calendar/status")
      .then((response) => response.ok ? response.json() : null)
      .then((next: CalendarHealth | null) => { if (!cancelled) setHealth(next); })
      .catch(() => { if (!cancelled) setHealth(null); });
    return () => { cancelled = true; };
  }, []);
  const first = new Date(`${month}T00:00:00+06:00`);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const blanks = (first.getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const moveMonth = (offset: number) => setMonth(new Date(year, monthIndex + offset, 1).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit" }) + "-01");
  const unscheduled = activeTasks.filter((task) => task.status !== "completed" && !plannedDate(task));
  const syncCalendar = async () => {
    setSyncing(true);
    setSyncMessage("");
    const response = await fetch("/api/calendar/sync", { method: "POST" }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { synced?: number; error?: string } | null : null;
    await refreshHealth();
    setSyncing(false);
    setSyncMessage(response?.ok ? `Synced ${body?.synced ?? 0} app-owned change${body?.synced === 1 ? "" : "s"}.` : body?.error ?? "Calendar sync failed. Your local plan is unchanged.");
  };
  return <main id="main-content" tabIndex={-1} className="page calendar-page">
    <SectionTitle kicker="APP-OWNED STUDY BLOCKS ONLY" title="Study calendar"><div className="calendar-actions"><button onClick={() => moveMonth(-1)} aria-label="Previous month"><CaretLeft /></button><strong>{monthLabel(month)}</strong><button onClick={() => moveMonth(1)} aria-label="Next month"><CaretRight /></button><button className="accent" onClick={() => add()}><Plus />Add task</button></div></SectionTitle>
    <section className={`calendar-health ${health?.connected ? "ok" : "warn"}`}><CalendarBlank weight="fill" /><p><strong>{health?.connected ? "Google Calendar connected" : health?.authenticated ? health?.configured ? "Google Calendar is ready to connect" : "Calendar configuration is incomplete" : "Sign in to enable Google Calendar"}</strong><small>{health?.connected ? `${health.linkedEvents ?? 0} linked app event${health.linkedEvents === 1 ? "" : "s"}${health.lastSuccessfulSync ? ` · last sync ${new Date(health.lastSuccessfulSync).toLocaleString("en-GB")}` : ""}` : health?.missing?.length ? `Missing: ${health.missing.join(", ")}` : "Your in-app calendar works locally; cloud sync requires authentication."}</small></p><button disabled={syncing} onClick={health?.connected ? syncCalendar : () => router.push("/api/calendar/connect")}>{health?.connected ? syncing ? "Syncing…" : "Sync now" : "Connect"}</button>{syncMessage && <small className="calendar-sync-message" role="status">{syncMessage}</small>}</section>
    <section className="calendar-layout"><div className="month-grid"><div className="weekday-row">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div><div className="day-grid">{cells.map((day, index) => { if (!day) return <div className="day empty-cell" key={`blank-${index}`} />; const date = `${month.slice(0, 8)}${String(day).padStart(2, "0")}`; const items = activeTasks.filter((task) => plannedDate(task) === date); return <article className="day" key={date}><button className="day-number" onClick={() => add(date)}>{day}<Plus /></button>{items.slice(0, 3).map((task) => <button className={`calendar-task ${bySubject(task.subjectId).accent}`} key={task.id} onClick={() => openTask(task)} aria-label={`Open ${task.title} in today's timeline`}><strong>{task.plannedTime}</strong><span>{bySubject(task.subjectId).shortName}</span></button>)}{items.length > 3 && <small>+{items.length - 3} more</small>}</article>; })}</div></div><aside className="panel unscheduled"><SectionTitle kicker="NEEDS A DATE" title={`${unscheduled.length} unscheduled`} />{unscheduled.slice(0, 12).map((task) => <div key={task.id}><p><strong>{task.title}</strong><small>{bySubject(task.subjectId).shortName} · {task.duration} min</small></p><input type="date" aria-label={`Schedule ${task.title}`} onChange={(event) => event.target.value && update(scheduleOn(task, event.target.value))} /></div>)}{!unscheduled.length && <div className="empty compact"><CheckCircle /><h3>Everything is placed.</h3><p>Move a task in Google Calendar, then sync to bring the change back.</p></div>}</aside></section>
  </main>;
}

function Journal({ entries, add }: { entries: JournalEntry[]; add: () => void }) {
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="YOUR EVIDENCE, NOT A STREAK" title="Study journal"><button className="accent" onClick={add}><Plus />Add entry</button></SectionTitle><section className="journal-grid">{entries.length ? entries.map((entry) => <article key={entry.id}><span>{bySubject(entry.subjectId).shortName}</span><h3>{byChapter(entry.chapterId).title}</h3><p>{entry.reflection}</p><div><b>{entry.minutes}m</b><b>{entry.correct}/{entry.attempted}</b><b>{entry.confidenceBefore}→{entry.confidenceAfter}</b></div><small>Next: {entry.nextAction}</small></article>) : <article className="empty"><NotePencil /><h3>Record what you studied.</h3><p>Add an entry after any study session. Record the result, what was difficult, and what you will do next.</p></article>}</section></main>;
}

function Progress({ entries, list, mocks, addMock, sessions, tasks }: { entries: JournalEntry[]; list: Chapter[]; mocks: MockResult[]; addMock: () => void; sessions: StudySession[]; tasks: StudyTask[] }) {
  const studied = list.filter((chapter) => chapter.status !== "not-started").length;
  const ready = list.filter((chapter) => chapter.status === "exam-ready").length;
  const mathEntries = entries.filter((entry) => entry.subjectId === "mathematics");
  const mathsAccuracy = mathEntries.reduce((sum, entry) => sum + entry.attempted, 0) ? Math.round(mathEntries.reduce((sum, entry) => sum + entry.correct, 0) / mathEntries.reduce((sum, entry) => sum + entry.attempted, 0) * 100) : 0;
  const latestMock = [...mocks].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="RESULTS OVER BUSYWORK" title="Progress intelligence"><button className="accent" onClick={addMock}><Plus />Record mock</button></SectionTitle><StudyAnalytics sessions={sessions} entries={entries} tasks={tasks} /><section className="metrics">{[["Coverage", `${Math.round(studied / list.length * 100)}%`, "lilac"], ["Exam-ready", ready, "mint"], ["Journal entries", entries.length, "yellow"], [latestMock ? "Latest mock" : "Maths accuracy", latestMock ? `${Math.round(latestMock.score / latestMock.total * 100)}%` : `${mathsAccuracy}%`, "pink"]].map(([label, value, tone]) => <article className={String(tone)} key={label}><small>{label}</small><strong>{value}</strong><span>Current evidence</span></article>)}</section><section className="progress-layout"><section className="panel subject-progress"><SectionTitle kicker="SUBJECT READINESS" title="Where attention is buying marks" />{subjects.map((subject) => { const mine = list.filter((chapter) => chapter.subjectId === subject.id); const score = Math.round(mine.reduce((sum, chapter) => sum + chapter.confidence, 0) / (mine.length * 5) * 100); return <div key={subject.id}><span>{subject.shortName}</span><i><b className={subject.accent} style={{ width: `${score}%` }} /></i><strong>{score}%</strong></div>; })}</section><aside className="panel mock-history"><SectionTitle kicker="EXAM EVIDENCE" title="Mock results" />{mocks.length ? [...mocks].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, 6).map((mock) => <article key={mock.id}><p><strong>{bySubject(mock.subjectId).shortName}</strong><small>{mock.paperType} · {new Date(mock.takenAt).toLocaleDateString("en-GB")}</small></p><b>{mock.score}/{mock.total}</b></article>) : <div className="empty compact"><Exam /><h3>No mock results yet.</h3><p>Record a full paper or timed section to strengthen recommendations.</p></div>}</aside></section></main>;
}

function RevisionModal({ mistake, close, save }: { mistake: Mistake; close: () => void; save: (outcome: "solved" | "needs-work", note: string) => void }) {
  const [outcome, setOutcome] = useState<"solved" | "needs-work">("solved");
  const [note, setNote] = useState("");
  const delay = outcome === "solved" ? 7 : revisionDelayDays(mistake.revisionCount ?? 0);
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="revision-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); save(outcome, note); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>DELIBERATE RETRIEVAL</small><h2 id="revision-title">Reattempt this mistake</h2><p className="revision-prompt">{mistake.prompt}</p><small>{byChapter(mistake.chapterId).title} · {mistake.errorType} · {mistake.revisionCount ?? 0} previous attempt{(mistake.revisionCount ?? 0) === 1 ? "" : "s"}</small><label>What happened?<select autoFocus value={outcome} onChange={(event) => setOutcome(event.target.value as "solved" | "needs-work")}><option value="solved">Solved without help</option><option value="needs-work">Still needs work</option></select></label><label>Revision note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What made the answer work, or where did you get stuck?" /></label><p className="revision-next">{outcome === "solved" ? "Closes this item and schedules a light 7-day check." : `Keeps it open and schedules another focused attempt in ${delay} day${delay === 1 ? "" : "s"}.`}</p><button className="solid-cta"><CheckCircle weight="fill" />Save revision attempt</button></form></div>;
}

function MathsLab({ mistakes, chapters, review, goToday }: { mistakes: Mistake[]; chapters: Chapter[]; review: (mistake: Mistake) => void; goToday: () => void }) {
  const openMistakes = mistakes.filter((mistake) => !mistake.resolved);
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="CORRECT WITHOUT HELP TO CLOSE AN ITEM" title="Maths reattempt lab"><span className="open-count">{openMistakes.length} open</span></SectionTitle><section className="math-layout"><div className="mistakes">{mistakes.length ? mistakes.map((mistake, index) => <article className={mistake.resolved ? "resolved" : ""} key={mistake.id}><span>{index + 1}</span><p><small>{byChapter(mistake.chapterId).division} · {mistake.errorType}</small><strong>{mistake.prompt}</strong><em>{byChapter(mistake.chapterId).title} · {mistake.revisionCount ?? 0} attempt{(mistake.revisionCount ?? 0) === 1 ? "" : "s"}{mistake.reattemptDate ? ` · next ${new Date(`${mistake.reattemptDate}T00:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</em></p><button onClick={() => review(mistake)}>{mistake.resolved ? <><ArrowCounterClockwise />Review again</> : <><Timer />Start revision attempt</>}</button></article>) : <article className="maths-empty"><div className="empty-icon"><CheckCircle weight="fill" /></div><small>NO OPEN RETRIES</small><h3>Your Maths queue is clear.</h3><p>When a Maths journal entry includes a difficult concept, it will appear here for a focused reattempt.</p><button className="solid-cta" onClick={goToday}><ArrowRight />Open Today</button></article>}</div><aside className="division"><small>DIVISION COVERAGE</small>{["Algebra", "Geometry", "Trigonometry & Mensuration", "Statistics"].map((division) => <div key={division}><span>{division}</span><b>{chapters.filter((chapter) => chapter.subjectId === "mathematics" && chapter.division === division).length} chapters</b></div>)}</aside></section></main>;
}

function ExamPlan() {
  const phases = [{ date: "15 Aug—13 Sep", title: "Coverage & diagnostics", start: "2026-08-15", end: "2026-09-13" }, { date: "14 Sep—11 Oct", title: "Active recall & writing", start: "2026-09-14", end: "2026-10-11" }, { date: "12—27 Oct", title: "Test mock phase", start: "2026-10-12", end: "2026-10-27" }, { date: "28 Oct—12 Nov", title: "Test exam mode", start: "2026-10-28", end: "2026-11-12" }, { date: "13 Nov—10 Dec", title: "Result-driven repair", start: "2026-11-13", end: "2026-12-10" }, { date: "11 Dec—6 Jan", title: "SSC mock cycles", start: "2026-12-11", end: "2027-01-06" }, { date: "7 Jan—6 Feb", title: "SSC exam mode", start: "2027-01-07", end: "2027-02-06" }];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const current = Math.max(0, phases.findIndex((phase) => today >= phase.start && today <= phase.end));
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="TWO FULL-SYLLABUS DEADLINES" title="Exam campaign" /><section className="phases">{phases.map((phase, index) => <article className={index === current ? "current" : index < current ? "complete" : ""} key={phase.date}><span>{index < current ? <Check weight="bold" /> : index + 1}</span><p><small>{phase.date}</small><strong>{phase.title}</strong><em>{index === current ? (today < phase.start ? "Starts tomorrow: prepare the first diagnostic list." : "This is the active preparation stage.") : "Full-syllabus preparation stage."}</em></p>{index === current && <b>{today < phase.start ? "Starts next" : "Current phase"}</b>}</article>)}</section></main>;
}

function Settings({ planning, setPlanning, profile, saveProfile, learningPreferences, saveAdaptive }: { planning: PlanningSettings; setPlanning: (value: PlanningSettings) => void; profile: UserProfile; saveProfile: (patch: Partial<UserProfile>) => Promise<void>; learningPreferences: LearningPreferences; saveAdaptive: (patch: Partial<LearningPreferences>, assessments?: SubjectAssessment[]) => Promise<void> }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [guidanceMode, setGuidanceMode] = useState(learningPreferences.guidanceMode);
  const [planStrictness, setPlanStrictness] = useState(learningPreferences.planStrictness);
  const [sessionLength, setSessionLength] = useState(learningPreferences.sessionLengthMinutes);
  const [health, setHealth] = useState<CalendarHealth | null>(null);
  const refreshHealth = () => void fetch("/api/calendar/status").then((response) => response.json()).then(setHealth).catch(() => setHealth(null));
  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;
    void client.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    refreshHealth();
    const status = new URLSearchParams(location.search).get("calendar");
    if (status) {
      const timer = window.setTimeout(() => setMessage(status === "connected" ? "Google Calendar connected. Run Sync now to create your study blocks." : "Google Calendar connection did not complete. Check the OAuth configuration and try again."), 0);
      history.replaceState(null, "", location.pathname);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const signOut = async () => { const client = createSupabaseClient(); await client?.auth.signOut(); setEmail(null); };
  const updateProfile = async () => { try { await saveProfile({ displayName: displayName.trim() || undefined }); setMessage("Profile updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Profile update failed."); } };
  const updateAdaptive = async () => { try { await saveAdaptive({ guidanceMode, planStrictness, sessionLengthMinutes: sessionLength }); setMessage("Your planning preferences were updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update planning preferences."); } };
  const restartOnboarding = async () => { try { await saveProfile({ onboardingStep: 0, onboardingCompleted: false }); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not restart setup."); } };
  const calendar = () => {
    if (!email) return setMessage("Sign in first, then connect Calendar.");
    if (!health?.configured) return setMessage(`Calendar setup is incomplete${health?.missing?.length ? `: ${health.missing.join(", ")}` : ""}. Add the missing server variables, then try again.`);
    router.push("/api/calendar/connect");
  };
  const syncNow = async () => {
    if (!email) return setMessage("Sign in first to synchronize calendar events.");
    setMessage("Checking connected Google Calendar…");
    const response = await fetch("/api/calendar/sync", { method: "POST" }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { synced?: number; error?: string } | null : null;
    setMessage(response?.ok ? `Calendar checked ${body?.synced ?? 0} app-owned event${body?.synced === 1 ? "" : "s"}.` : body?.error ?? "Calendar is not connected yet.");
    refreshHealth();
  };
  const enableReminders = async () => {
    if (!("Notification" in window)) return setMessage("This browser does not support notifications.");
    const permission = await Notification.requestPermission();
    setPlanning({ ...planning, remindersEnabled: permission === "granted" });
    setMessage(permission === "granted" ? "Reminders enabled. Calendar reminders remain the reliable option when the app is closed." : "Notification permission was not granted.");
  };
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="PRIVATE BY DEFAULT" title="Planning settings" /><section className="settings">
    <article className="auth-card account-card"><span className="lilac"><CloudCheck /></span><div><p><strong>{email ? "Cloud account connected" : "Cloud account"}</strong><small>{email ?? "Your account email"}</small></p><label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label><div className="settings-actions"><button onClick={updateProfile}>Save profile</button><button onClick={restartOnboarding}>Restart setup</button><button onClick={signOut}><SignOut />Sign out</button></div></div></article>
    <article className="settings-editor adaptive-settings"><span className="blue"><Brain /></span><p><strong>How SSC plans for you</strong><small>Current methods: {learningPreferences.preferredMethods.join(", ") || "Choose methods in setup"}. The planner learns from your feedback.</small></p><div className="inline-fields"><label>Guidance<select value={guidanceMode} onChange={(event) => setGuidanceMode(event.target.value as LearningPreferences["guidanceMode"])}><option value="guided">Guide me</option><option value="balanced">Balanced</option><option value="quiet">Quiet queue</option></select></label><label>Plan style<select value={planStrictness} onChange={(event) => setPlanStrictness(event.target.value as LearningPreferences["planStrictness"])}><option value="flexible">Flexible</option><option value="balanced">Balanced</option><option value="strict">Strict</option></select></label><label>Session length<select value={sessionLength} onChange={(event) => setSessionLength(Number(event.target.value))}><option value="25">25 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label></div><div className="settings-actions"><button onClick={updateAdaptive}>Save planning preferences</button><button onClick={restartOnboarding}>Run calibration again</button></div></article>
    <article><span className="lilac"><CalendarBlank /></span><p><strong>{health?.connected ? "Google Calendar connected" : "Google Calendar"}</strong><small>{health?.connected ? `${health.linkedEvents ?? 0} linked study blocks. Unrelated events stay untouched.` : health?.configured ? "Ready to connect app-owned study blocks." : health?.missing?.length ? `Setup missing: ${health.missing.join(", ")}` : "Sync only app-owned study blocks. Unrelated events stay untouched."}</small></p><div className="settings-actions"><button className={health?.connected ? "connected" : ""} onClick={calendar}>{health?.connected ? "Reconnect" : "Connect"}</button><button onClick={syncNow}>Sync now</button></div></article>
    <article className="settings-editor"><span className="mint"><Clock /></span><p><strong>Study windows</strong><small>These guide planning without locking every day into a rigid routine.</small></p><div className="inline-fields"><label>Main starts<input type="time" value={planning.mainStart} onChange={(event) => setPlanning({ ...planning, mainStart: event.target.value })} /></label><label>Main ends<input type="time" value={planning.mainEnd} onChange={(event) => setPlanning({ ...planning, mainEnd: event.target.value })} /></label><label>Maths starts<input type="time" value={planning.mathStart} onChange={(event) => setPlanning({ ...planning, mathStart: event.target.value })} /></label><label>Maths ends<input type="time" value={planning.mathEnd} onChange={(event) => setPlanning({ ...planning, mathEnd: event.target.value })} /></label></div></article>
    <article className="settings-editor"><span className="yellow"><Brain /></span><p><strong>Recommendation control</strong><small>Weakness-first rules stay explainable; manual pins still override them.</small></p><div className="inline-fields"><label>Daily target<input type="number" min="60" max="600" value={planning.dailyTarget} onChange={(event) => setPlanning({ ...planning, dailyTarget: Number(event.target.value) })} /><em>min</em></label><label>Maths<input type="number" min="1" max="7" value={planning.mathDaysPerWeek} onChange={(event) => setPlanning({ ...planning, mathDaysPerWeek: Number(event.target.value) })} /><em>days/week</em></label><label>Agriculture<input type="number" min="1" max="7" value={planning.agricultureDaysPerWeek} onChange={(event) => setPlanning({ ...planning, agricultureDaysPerWeek: Number(event.target.value) })} /><em>days/week</em></label></div></article>
    <article><span className="pink"><CloudCheck /></span><p><strong>Database storage</strong><small>Study data is stored directly in Supabase. Offline queues and local fallbacks are disabled.</small></p><button onClick={syncNow}>Check connection</button></article>
    <article><span className="blue"><Warning /></span><p><strong>Study reminders</strong><small>{planning.remindersEnabled ? "Browser permission granted." : "Optional browser and install reminders."}</small></p><button onClick={enableReminders}>{planning.remindersEnabled ? "Enabled" : "Enable"}</button></article>
    {message && <p className="settings-message">{message}</p>}
  </section></main>;
}

function ManualTaskModal({ close, save, defaultDate, preferences }: { close: () => void; save: (task: StudyTask) => void; defaultDate?: string; preferences: ChapterPreference[] }) {
  const selectable = chapters.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded);
  const selectableSubjects = subjects.filter((subject) => selectable.some((chapter) => chapter.subjectId === subject.id));
  const initialSubject = selectable.some((chapter) => chapter.subjectId === "mathematics") ? "mathematics" : selectable[0]?.subjectId ?? "mathematics";
  const [subjectId, setSubjectId] = useState(initialSubject);
  const available = selectable.filter((chapter) => chapter.subjectId === subjectId);
  const [chapterId, setChapterId] = useState(available[0]?.id ?? selectable[0]?.id ?? chapters[0]?.id ?? "");
  const [time, setTime] = useState("3:00 PM");
  const [duration, setDuration] = useState(45);
  const [date, setDate] = useState(defaultDate ?? "");
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-task-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); const chapter = byChapter(chapterId); const task: StudyTask = { id: crypto.randomUUID(), subjectId, chapterId, title: chapter.title, plannedTime: time, duration, origin: "manual", pinned: true, status: "planned", currentStep: 0, reason: "Manual priority · pinned first", priorityScore: 100, focusedSeconds: 0 }; save(date ? scheduleOn(task, date) : task); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>MANUAL CONTROL</small><h2 id="manual-task-title">Add a study task</h2><label>Subject<select autoFocus value={subjectId} onChange={(event) => { const nextSubject = event.target.value; setSubjectId(nextSubject); setChapterId(selectable.find((chapter) => chapter.subjectId === nextSubject)!.id); }}>{selectableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>{available.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><div className="form-row"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Planned time<input value={time} onChange={(event) => setTime(event.target.value)} /></label><label>Minutes<input type="number" min="10" max="240" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div><button className="solid-cta"><Plus />Add and pin first</button></form></div>;
}

function JournalModal({ task, close, save }: { task: StudyTask; close: () => void; save: (entry: JournalEntry) => void }) {
  const manual = !task.id;
  const selectableSubjects = subjects.filter((subject) => chapters.some((chapter) => chapter.subjectId === subject.id));
  const [subjectId, setSubjectId] = useState(task.subjectId);
  const [chapterId, setChapterId] = useState(task.chapterId);
  const availableChapters = chapters.filter((chapter) => chapter.subjectId === subjectId);
  const selectedChapter = byChapter(chapterId);
  const [minutes, setMinutes] = useState(Math.max(1, Math.round((task.focusedSeconds ?? 0) / 60)) || task.duration);
  const [attempted, setAttempted] = useState(10);
  const [correct, setCorrect] = useState(7);
  const [before, setBefore] = useState(2);
  const [after, setAfter] = useState(3);
  const [goal, setGoal] = useState(`Understand and practise ${byChapter(task.chapterId).title}`);
  const [resources, setResources] = useState("NotebookLM, guidebook");
  const [mistakesText, setMistakesText] = useState("");
  const [writtenScore, setWrittenScore] = useState("");
  const [reflection, setReflection] = useState("");
  const [nextAction, setNextAction] = useState("Review weak questions tomorrow");
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="journal-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form className="journal-form" onSubmit={(event) => { event.preventDefault(); save({ id: crypto.randomUUID(), taskId: task.id, subjectId, chapterId, minutes, attempted, correct, confidenceBefore: before, confidenceAfter: after, learningGoal: goal, resources: resources.split(",").map((item) => item.trim()).filter(Boolean), mistakesText: mistakesText || undefined, writtenScore: writtenScore ? Number(writtenScore) : undefined, reflection: reflection || "Completed the workflow and found the next gap.", nextAction, createdAt: new Date().toISOString() }); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>{manual ? "MANUAL EVIDENCE" : "COMPLETE THE LOOP"}</small><h2 id="journal-title">{manual ? "New journal entry" : "Session journal"}</h2><p>{bySubject(subjectId).shortName} · {selectedChapter.title}</p>{manual && <div className="form-row journal-subject-fields"><label>Subject<select autoFocus value={subjectId} onChange={(event) => { const nextSubject = event.target.value; const nextChapter = chapters.find((chapter) => chapter.subjectId === nextSubject); setSubjectId(nextSubject); if (nextChapter) setChapterId(nextChapter.id); }}>{selectableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>{availableChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label></div>}<label>Learning goal<input autoFocus value={goal} onChange={(event) => setGoal(event.target.value)} required /></label><label>Resources used<input value={resources} onChange={(event) => setResources(event.target.value)} placeholder="NotebookLM, guidebook, ChatGPT" /></label><div className="form-row"><label>Focused minutes<input type="number" min="1" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><label>Attempted<input type="number" min="0" value={attempted} onChange={(event) => { const next = Math.max(0, Number(event.target.value)); setAttempted(next); setCorrect((current) => Math.min(current, next)); }} /></label><label>Correct<input type="number" min="0" max={attempted} value={correct} onChange={(event) => setCorrect(Math.max(0, Math.min(attempted, Number(event.target.value))))} /></label></div><div className="form-row"><label>Confidence before<input type="number" min="1" max="5" value={before} onChange={(event) => setBefore(Number(event.target.value))} /></label><label>Confidence after<input type="number" min="1" max="5" value={after} onChange={(event) => setAfter(Number(event.target.value))} /></label><label>Written/mock score<input type="number" min="0" value={writtenScore} onChange={(event) => setWrittenScore(event.target.value)} placeholder="Optional" /></label></div><label>Mistakes or difficult concepts<textarea value={mistakesText} onChange={(event) => setMistakesText(event.target.value)} placeholder="For Maths, this enters the reattempt queue." /></label><label>Reflection<textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What became clear? What remains difficult?" /></label><label>Next action<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label><button className="solid-cta"><CheckCircle weight="fill" />Save and update recommendations</button></form></div>;
}

function MockResultModal({ close, save }: { close: () => void; save: (result: MockResult) => void }) {
  const [subjectId, setSubjectId] = useState("mathematics");
  const [paperType, setPaperType] = useState("Full paper");
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(100);
  const [duration, setDuration] = useState(180);
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mock-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); save({ id: crypto.randomUUID(), subjectId, paperType, score, total, durationMinutes: duration, takenAt: new Date().toISOString() }); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>EXAM EVIDENCE</small><h2 id="mock-title">Record a mock result</h2><label>Subject<select autoFocus value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTotal(officialTotalFor(event.target.value) || 100); }}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Paper or section<input value={paperType} onChange={(event) => setPaperType(event.target.value)} /></label><div className="form-row"><label>Score<input type="number" min="0" max={total} value={score} onChange={(event) => setScore(Math.max(0, Math.min(total, Number(event.target.value))))} /></label><label>Out of<input type="number" min="1" value={total} onChange={(event) => { const next = Math.max(1, Number(event.target.value)); setTotal(next); setScore((current) => Math.min(current, next)); }} /></label><label>Minutes<input type="number" min="1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div><button className="solid-cta"><Exam />Save mock evidence</button></form></div>;
}

function DatabaseGate({ status, error }: { status: "loading" | "auth-required" | "error"; error: string }) {
  if (status === "auth-required") return <AuthScreen />;
  return <main className="database-gate" aria-live="polite"><section className="panel"><CloudCheck size={42} weight="fill" /><small>SUPABASE WORKSPACE</small><h1>{status === "loading" ? "Loading your study workspace" : "Database connection required"}</h1><p>{status === "loading" ? "Fetching your syllabus, goals, tasks, evidence, and resources from the database…" : error}</p>{status === "error" && <Button size="lg" className="solid-cta" onClick={() => location.reload()}><ArrowCounterClockwise />Retry database connection</Button>}</section></main>;
}

export default function CommandCenter() {
  const [active, setActive] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menu]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [mocks, setMocks] = useState<MockResult[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);
  const [planning, setPlanning] = useState<PlanningSettings>({ mainStart: "15:00", mainEnd: "19:00", mathStart: "20:00", mathEnd: "22:00", dailyTarget: 240, mathDaysPerWeek: 6, agricultureDaysPerWeek: 4, remindersEnabled: false });
  const [preferences, setPreferences] = useState<ChapterPreference[]>([]);
  const [learningPreferences, setLearningPreferences] = useState<LearningPreferences>({ userId: "", preferredMethods: ["textbook", "question-bank"], preferredResourceKinds: ["textbook", "question-bank"], sessionLengthMinutes: 45, sessionsPerDay: 2, availableDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], weekdayMinutes: 120, weekendMinutes: 180, targetGrade: "A", guidanceMode: "guided", planStrictness: "flexible", instructionRatio: 30, practiceRatio: 50, reviewRatio: 20, createdAt: "", updatedAt: "" });
  const [subjectAssessments, setSubjectAssessments] = useState<SubjectAssessment[]>([]);
  const [recommendationFeedback, setRecommendationFeedback] = useState<RecommendationFeedback[]>([]);
  const [journalTask, setJournalTask] = useState<StudyTask | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState<string | undefined>();
  const [mockOpen, setMockOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [resourceChapterId, setResourceChapterId] = useState<string | undefined>();
  const [revisionMistake, setRevisionMistake] = useState<Mistake | null>(null);
  const [planSummary, setPlanSummary] = useState<AdaptivePlanSummary | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<"loading" | "ready" | "auth-required" | "error">("loading");
  const [databaseError, setDatabaseError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const response = await fetch("/api/sync/bootstrap").catch(() => null);
      if (!response) { setDatabaseStatus("error"); setDatabaseError("The database could not be reached. Check your connection and try again."); return; }
      if (response.status === 401) { setDatabaseStatus("auth-required"); setDatabaseError("Sign in to load your study workspace."); return; }
      if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; setDatabaseStatus("error"); setDatabaseError(body?.error ?? "The database is unavailable."); return; }
      const payload = await response.json().catch(() => null) as { mode?: string; data?: Record<string, Record<string, unknown>[]> } | null;
      if (cancelled || payload?.mode !== "cloud" || !payload.data) { setDatabaseStatus("error"); setDatabaseError("The database returned an invalid workspace response."); return; }
      const data = payload.data;
      const loadedSubjects: Subject[] = (data.subjects ?? []).map((row) => ({ id: String(row.id), name: String(row.name), shortName: String(row.short_name), strength: String(row.strength_level) as Subject["strength"], weaknessScore: Number(row.priority), workflow: String(row.workflow_kind) as Subject["workflow"], accent: subjectAccent[String(row.id)] ?? "blue" }));
      const loadedChapters: Chapter[] = (data.chapters ?? []).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), number: row.chapter_number == null ? undefined : Number(row.chapter_number), title: String(row.title), division: row.division ? String(row.division) : undefined, note: row.note ? String(row.note) : undefined, status: "not-started", confidence: 1, formats: Array.isArray(row.question_formats) ? row.question_formats.map(String) : [], questionsAttempted: 0, questionsCorrect: 0 }));
      const loadedMarks: MarksDistribution[] = (data.marks_distributions ?? []).map((row) => ({ subjectId: String(row.subject_id), part: row.part ? String(row.part) : undefined, questionType: String(row.question_type), rule: String(row.choice_rule), marks: Number(row.marks) }));
      const loadedExams = (data.exams ?? []).map((row) => ({ id: String(row.id), name: String(row.name), start: String(row.starts_on), end: String(row.ends_on) }));
      const loadedWorkflows = Object.fromEntries((data.workflow_steps ?? []).map((row) => [String(row.workflow_kind), Array.isArray(row.steps) ? row.steps.map(String) : []])) as unknown as typeof workflowSteps;
      replaceAcademicData({ subjects: loadedSubjects, chapters: loadedChapters, marksDistributions: loadedMarks, exams: loadedExams, workflowSteps: loadedWorkflows });
      const progress = new Map((data.chapter_progress ?? []).map((row) => [String(row.chapter_id), row]));
      setChapterList(loadedChapters.map((chapter) => { const row = progress.get(chapter.id); return row ? { ...chapter, status: row.status as Chapter["status"], confidence: Number(row.confidence) as Chapter["confidence"], lastStudied: row.last_studied ? String(row.last_studied) : undefined, nextReview: row.next_review ? String(row.next_review) : undefined, questionsAttempted: Number(row.questions_attempted), questionsCorrect: Number(row.questions_correct) } : chapter; }));
      setTasks((data.study_tasks ?? []).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), title: String(row.title), plannedTime: row.planned_start ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(new Date(String(row.planned_start))) : "Unscheduled", plannedStart: row.planned_start ? String(row.planned_start) : undefined, plannedEnd: row.planned_end ? String(row.planned_end) : undefined, deferredUntil: row.deferred_until ? String(row.deferred_until) : undefined, duration: Number(row.duration_minutes), origin: row.origin as StudyTask["origin"], pinned: Boolean(row.pinned), status: row.status as StudyTask["status"], currentStep: Number(row.current_step), reason: String(row.priority_explanation ?? "Database task"), priorityScore: Number(row.priority_score), focusedSeconds: Number(row.focused_seconds ?? 0), studyMethod: row.study_method ? String(row.study_method) as StudyTask["studyMethod"] : undefined, recommendationFactors: row.recommendation_factors && typeof row.recommendation_factors === "object" ? row.recommendation_factors as Record<string, number> : undefined })));
      setPreferences((data.chapter_preferences ?? []).map((row) => ({ chapterId: String(row.chapter_id), includedForSsc: Boolean(row.included_for_ssc), targetMonth: row.target_month ? String(row.target_month) : undefined, excluded: Boolean(row.excluded), exclusionReason: row.exclusion_reason ? String(row.exclusion_reason) : undefined, priority: Number(row.priority) as ChapterPreference["priority"] })));
      const learningRow = data.learning_preferences?.[0];
      if (learningRow) setLearningPreferences({ userId: String(learningRow.user_id), preferredMethods: Array.isArray(learningRow.preferred_methods) ? learningRow.preferred_methods.map(String) as LearningPreferences["preferredMethods"] : ["textbook", "question-bank"], preferredResourceKinds: Array.isArray(learningRow.preferred_resource_kinds) ? learningRow.preferred_resource_kinds.map(String) as LearningPreferences["preferredResourceKinds"] : ["textbook", "question-bank"], sessionLengthMinutes: Number(learningRow.session_length_minutes), sessionsPerDay: Number(learningRow.sessions_per_day), availableDays: Array.isArray(learningRow.available_days) ? learningRow.available_days.map(String) : [], weekdayMinutes: Number(learningRow.weekday_minutes), weekendMinutes: Number(learningRow.weekend_minutes), targetGrade: String(learningRow.target_grade), guidanceMode: String(learningRow.guidance_mode) as LearningPreferences["guidanceMode"], planStrictness: String(learningRow.plan_strictness) as LearningPreferences["planStrictness"], instructionRatio: Number(learningRow.instruction_ratio), practiceRatio: Number(learningRow.practice_ratio), reviewRatio: Number(learningRow.review_ratio), createdAt: String(learningRow.created_at), updatedAt: String(learningRow.updated_at) });
      setSubjectAssessments((data.subject_assessments ?? []).map((row) => ({ id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), difficulty: Number(row.difficulty) as SubjectAssessment["difficulty"], confidence: Number(row.confidence) as SubjectAssessment["confidence"], priority: Number(row.priority) as SubjectAssessment["priority"], startingPoint: String(row.starting_point) as SubjectAssessment["startingPoint"], preferredMethods: Array.isArray(row.preferred_methods) ? row.preferred_methods.map(String) as SubjectAssessment["preferredMethods"] : [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) })));
      setRecommendationFeedback((data.recommendation_feedback ?? []).map((row) => ({ id: String(row.id), userId: String(row.user_id), taskId: row.task_id ? String(row.task_id) : undefined, subjectId: row.subject_id ? String(row.subject_id) : undefined, chapterId: row.chapter_id ? String(row.chapter_id) : undefined, feedbackType: String(row.feedback_type) as RecommendationFeedback["feedbackType"], method: row.method ? String(row.method) as RecommendationFeedback["method"] : undefined, note: row.note ? String(row.note) : undefined, createdAt: String(row.created_at) })));
      setEntries((data.journal_entries ?? []).map((row) => ({ id: String(row.id), taskId: String(row.task_id ?? ""), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), minutes: Number(row.minutes), attempted: Number(row.attempted), correct: Number(row.correct), confidenceBefore: Number(row.confidence_before), confidenceAfter: Number(row.confidence_after), learningGoal: String(row.learning_goal ?? ""), resources: Array.isArray(row.resources) ? row.resources.map(String) : [], mistakesText: row.mistakes_text ? String(row.mistakes_text) : undefined, writtenScore: row.written_score == null ? undefined : Number(row.written_score), reflection: String(row.reflection ?? ""), nextAction: String(row.next_action ?? ""), createdAt: String(row.created_at) })));
      setMistakes((data.mistakes ?? []).map((row) => ({ id: String(row.id), chapterId: String(row.chapter_id), prompt: String(row.prompt), errorType: String(row.error_type), reattemptDate: String(row.reattempt_date ?? ""), resolved: Boolean(row.resolved), revisionCount: Number(row.revision_count ?? 0), lastAttemptedAt: row.last_attempted_at ? String(row.last_attempted_at) : undefined, lastAttemptNote: row.last_attempt_note ? String(row.last_attempt_note) : undefined })));
      setMocks((data.mock_results ?? []).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), paperType: String(row.paper_type ?? "Full paper"), score: Number(row.score), total: Number(row.total), durationMinutes: row.duration_minutes == null ? undefined : Number(row.duration_minutes), takenAt: String(row.taken_at) })));
      setSessions((data.study_sessions ?? []).map((row) => ({ id: String(row.id), taskId: String(row.task_id), subjectId: String(row.subject_id ?? ""), chapterId: String(row.chapter_id ?? ""), mode: row.mode === "exam" ? "exam" : "focus", startedAt: String(row.started_at), endedAt: row.ended_at ? String(row.ended_at) : undefined, focusedSeconds: Number(row.focused_seconds ?? 0), pauseSeconds: Number(row.pause_seconds ?? 0), completed: Boolean(row.completed), questionsAttempted: row.questions_attempted == null ? undefined : Number(row.questions_attempted), questionsCorrect: row.questions_correct == null ? undefined : Number(row.questions_correct) })));
      setResources((data.study_resources ?? []).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), title: String(row.title), url: String(row.url), kind: row.kind as StudyResource["kind"], note: row.note ? String(row.note) : undefined, archived: Boolean(row.archived), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })));
      setExamEvents((data.exam_events ?? []).map((row) => ({ id: String(row.id), name: String(row.name), start: String(row.starts_on), end: String(row.ends_on), kind: row.kind as ExamEvent["kind"], scope: Array.isArray(row.scope) ? row.scope.map(String) : [], note: row.note ? String(row.note) : undefined, locked: Boolean(row.locked), archived: Boolean(row.archived) })).filter((event) => !event.archived));
      const planningRow = data.planning_settings?.[0];
      if (planningRow) setPlanning({ mainStart: String(planningRow.main_start), mainEnd: String(planningRow.main_end), mathStart: String(planningRow.math_start), mathEnd: String(planningRow.math_end), dailyTarget: Number(planningRow.daily_target), mathDaysPerWeek: Number(planningRow.math_days_per_week), agricultureDaysPerWeek: Number(planningRow.agriculture_days_per_week), remindersEnabled: Boolean(planningRow.reminders_enabled) });
      const summaryRow = data.adaptive_plan_summaries?.[0];
      if (summaryRow) setPlanSummary({ usedMinutes: Number(summaryRow.used_minutes), availableMinutes: Number(summaryRow.available_minutes), deferredCount: Number(summaryRow.deferred_count), generatedRevisionCount: Number(summaryRow.generated_revision_count), rationale: Array.isArray(summaryRow.rationale) ? summaryRow.rationale.map(String) : [], plannedAt: String(summaryRow.planned_at) });
      const profileRow = data.user_profiles?.[0];
      if (profileRow) setProfile({ userId: String(profileRow.user_id), displayName: profileRow.display_name ? String(profileRow.display_name) : undefined, board: String(profileRow.board), examYear: Number(profileRow.exam_year), selectedSubjects: Array.isArray(profileRow.selected_subjects) ? profileRow.selected_subjects.map(String) : [], dailyTarget: Number(profileRow.daily_target), mainStart: String(profileRow.main_start), mainEnd: String(profileRow.main_end), onboardingStep: Number(profileRow.onboarding_step), onboardingCompleted: Boolean(profileRow.onboarding_completed), createdAt: String(profileRow.created_at), updatedAt: String(profileRow.updated_at) });
      if (!cancelled) setDatabaseStatus("ready");
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  const persist = (table: string, rows: Record<string, unknown>[]) => { void queueCloudSync(table, rows).catch((error: unknown) => { setDatabaseStatus("error"); setDatabaseError(error instanceof Error ? error.message : "Database write failed"); }); };

  const saveProfile = async (patch: Partial<UserProfile>) => {
    if (!profile) return;
    const body = {
      display_name: patch.displayName,
      board: patch.board,
      exam_year: patch.examYear,
      selected_subjects: patch.selectedSubjects,
      daily_target: patch.dailyTarget,
      main_start: patch.mainStart,
      main_end: patch.mainEnd,
      onboarding_step: patch.onboardingStep,
      onboarding_completed: patch.onboardingCompleted,
    };
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => null) as { profile?: Record<string, unknown>; error?: string } | null;
    if (!response.ok || !payload?.profile) throw new Error(payload?.error ?? "Could not save your profile");
    const row = payload.profile;
    setProfile({ userId: String(row.user_id), displayName: row.display_name ? String(row.display_name) : undefined, board: String(row.board), examYear: Number(row.exam_year), selectedSubjects: Array.isArray(row.selected_subjects) ? row.selected_subjects.map(String) : [], dailyTarget: Number(row.daily_target), mainStart: String(row.main_start), mainEnd: String(row.main_end), onboardingStep: Number(row.onboarding_step), onboardingCompleted: Boolean(row.onboarding_completed), createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
  };

  const saveAdaptiveProfile = async (patch: Partial<LearningPreferences>, assessments?: SubjectAssessment[]) => {
    if (!profile) return;
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ learning_preferences: learningPreferencesRow(patch), subject_assessments: assessments?.map(subjectAssessmentRow) }) });
    const payload = await response.json().catch(() => null) as { learning_preferences?: Record<string, unknown>; subject_assessments?: Record<string, unknown>[]; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "Could not save your study preferences");
    if (payload?.learning_preferences) {
      const row = payload.learning_preferences;
      setLearningPreferences({ userId: String(row.user_id), preferredMethods: Array.isArray(row.preferred_methods) ? row.preferred_methods.map(String) as LearningPreferences["preferredMethods"] : learningPreferences.preferredMethods, preferredResourceKinds: Array.isArray(row.preferred_resource_kinds) ? row.preferred_resource_kinds.map(String) as LearningPreferences["preferredResourceKinds"] : learningPreferences.preferredResourceKinds, sessionLengthMinutes: Number(row.session_length_minutes), sessionsPerDay: Number(row.sessions_per_day), availableDays: Array.isArray(row.available_days) ? row.available_days.map(String) : learningPreferences.availableDays, weekdayMinutes: Number(row.weekday_minutes), weekendMinutes: Number(row.weekend_minutes), targetGrade: String(row.target_grade), guidanceMode: String(row.guidance_mode) as LearningPreferences["guidanceMode"], planStrictness: String(row.plan_strictness) as LearningPreferences["planStrictness"], instructionRatio: Number(row.instruction_ratio), practiceRatio: Number(row.practice_ratio), reviewRatio: Number(row.review_ratio), createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
    }
    if (payload?.subject_assessments) setSubjectAssessments(payload.subject_assessments.map((row) => ({ id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), difficulty: Number(row.difficulty) as SubjectAssessment["difficulty"], confidence: Number(row.confidence) as SubjectAssessment["confidence"], priority: Number(row.priority) as SubjectAssessment["priority"], startingPoint: String(row.starting_point) as SubjectAssessment["startingPoint"], preferredMethods: Array.isArray(row.preferred_methods) ? row.preferred_methods.map(String) as SubjectAssessment["preferredMethods"] : [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) })));
  };

  const saveFeedback = (feedback: RecommendationFeedback) => {
    setRecommendationFeedback([feedback, ...recommendationFeedback]);
    persist("recommendation_feedback", [feedbackRow(feedback)]);
  };

  const recordFeedback = (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => saveFeedback({ id: crypto.randomUUID(), userId: learningPreferences.userId, taskId: task.id, subjectId: task.subjectId, chapterId: task.chapterId, feedbackType, method: task.studyMethod, createdAt: new Date().toISOString() });

  const saveSession = (session: StudySession) => {
    setSessions([session, ...sessions]);
    persist("study_sessions", [sessionRow(session)]);
  };

  const updatePlanning = (value: PlanningSettings) => {
    setPlanning(value);
    persist("planning_settings", [planningRow(value)]);
  };

  const saveExamEvents = (next: ExamEvent[]) => {
    const nextIds = new Set(next.map((event) => event.id));
    const archived = examEvents.filter((event) => !nextIds.has(event.id)).map((event) => ({ ...event, archived: true }));
    setExamEvents(next);
    persist("exam_events", [...next, ...archived].map(examEventRow));
  };

  const saveResource = (resource: StudyResource) => {
    setResources([resource, ...resources.filter((item) => item.id !== resource.id)]);
    persist("study_resources", [resourceRow(resource)]);
  };

  const removeResource = (resource: StudyResource) => {
    const archived = { ...resource, archived: true, updatedAt: new Date().toISOString() };
    setResources(resources.map((item) => item.id === resource.id ? archived : item));
    persist("study_resources", [resourceRow(archived)]);
  };

  const updateTask = (updated: StudyTask) => {
    const next = tasks.map((task) => task.id === updated.id ? updated : task);
    if (updated.pinned) next.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.priorityScore - a.priorityScore);
    setTasks(next);
    persist("study_tasks", [taskRow(updated)]);
  };

  const removeTaskFromToday = (task: StudyTask) => {
    updateTask({
      ...task,
      status: "skipped",
      pinned: false,
      plannedTime: "Removed",
      plannedStart: undefined,
      plannedEnd: undefined,
      deferredUntil: undefined,
    });
  };

  const addTask = (task: StudyTask) => {
    if (preferenceFor(task.chapterId, preferences).excluded) return;
    setTasks([task, ...tasks]);
    persist("study_tasks", [taskRow(task)]);
    setManualOpen(false);
    setManualDate(undefined);
    setActive("Home");
  };

  const openManual = (date?: string) => { setManualDate(date); setManualOpen(true); };

  const updatePreferences = (updates: ChapterPreference[]) => {
    const updatedIds = new Set(updates.map((item) => item.chapterId));
    setPreferences([...preferences.filter((item) => !updatedIds.has(item.chapterId)), ...updates]);
    persist("chapter_preferences", updates.map(preferenceRow));
  };

  const updatePreference = (updated: ChapterPreference) => {
    updatePreferences([updated]);
    if (updated.excluded) {
      const affected = tasks.filter((task) => task.chapterId === updated.chapterId && task.status !== "completed" && task.status !== "skipped").map((task) => ({ ...task, status: "skipped" as const, plannedStart: undefined, plannedEnd: undefined }));
      if (affected.length) {
        const byId = new Map(affected.map((task) => [task.id, task]));
        setTasks(tasks.map((task) => byId.get(task.id) ?? task));
        void queueCloudSync("study_tasks", affected.map(taskRow));
      }
    }
  };

  const completeChapter = (chapter: Chapter) => {
    const completedAt = chapter.lastStudied ?? new Date().toISOString();
    const updated: Chapter = { ...chapter, status: "exam-ready", confidence: Math.max(4, chapter.confidence) as Chapter["confidence"], lastStudied: completedAt, nextReview: new Date(Date.now() + 7 * 86400000).toISOString() };
    setChapterList(chapterList.map((item) => item.id === chapter.id ? updated : item));
    persist("chapter_progress", [chapterRow(updated)]);
  };

  const buildGoalQueue = (selected: Chapter[], label: string) => {
    const openChapterIds = new Set(tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").map((task) => task.chapterId));
    const candidates = selected
      .filter((chapter) => chapter.status !== "exam-ready" && !openChapterIds.has(chapter.id) && !preferenceFor(chapter.id, preferences).excluded)
      .sort((a, b) => preferenceFor(b.id, preferences).priority - preferenceFor(a.id, preferences).priority || a.confidence - b.confidence)
      .slice(0, 5);
    const generated = candidates.map((chapter) => {
      const base = recommendTasks(subjects, [chapter], { mistakes, mocks, assessments: subjectAssessments, feedback: recommendationFeedback, targetGrade: learningPreferences.targetGrade })[0];
      const priority = preferenceFor(chapter.id, preferences).priority;
      return {
        ...base,
        id: crypto.randomUUID(),
        plannedTime: "Unscheduled",
        plannedStart: undefined,
        plannedEnd: undefined,
        reason: `${label} · priority ${priority}/5`,
        priorityScore: Math.max(base.priorityScore, 65 + priority * 6),
      };
    });
    if (!generated.length) return;
    const next = [...generated, ...tasks];
    setTasks(next);
    persist("study_tasks", generated.map(taskRow));
    setActive("Calendar");
  };

  const save = (entry: JournalEntry) => {
    const accuracy = entry.attempted ? entry.correct / entry.attempted : 0;
    const status: Chapter["status"] = entry.confidenceAfter >= 4 && accuracy >= .8 ? "exam-ready" : accuracy < .6 ? "needs-revision" : "practising";
    const updatedChapter = { ...byChapter(entry.chapterId, chapterList), status, confidence: Math.max(1, Math.min(5, entry.confidenceAfter)) as Chapter["confidence"], questionsAttempted: byChapter(entry.chapterId, chapterList).questionsAttempted + entry.attempted, questionsCorrect: byChapter(entry.chapterId, chapterList).questionsCorrect + entry.correct, lastStudied: entry.createdAt, nextReview: new Date(Date.now() + (status === "exam-ready" ? 7 : 3) * 86400000).toISOString() };
    const updatedTasks = tasks.map((task) => task.id === entry.taskId ? { ...task, status: "completed" as const } : task);
    const updatedChapters = chapterList.map((chapter) => chapter.id === entry.chapterId ? updatedChapter : chapter);
    const nextMistakes = entry.subjectId === "mathematics" && entry.mistakesText ? [{ id: crypto.randomUUID(), chapterId: entry.chapterId, prompt: entry.mistakesText, errorType: "Session mistake", reattemptDate: dhakaDateAfter(1), resolved: false, revisionCount: 0 }, ...mistakes] : mistakes;
    const allowedChapters = updatedChapters.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded);
    const recommended = recommendTasks(subjects, allowedChapters, { mistakes: nextMistakes, mocks, assessments: subjectAssessments, feedback: recommendationFeedback, targetGrade: learningPreferences.targetGrade }).find((candidate) => !updatedTasks.some((task) => task.status !== "completed" && task.chapterId === candidate.chapterId));
    if (recommended) updatedTasks.push({ ...recommended, plannedTime: "Tomorrow", deferredUntil: new Date(Date.now() + 86400000).toISOString() });
    setEntries([entry, ...entries]);
    setTasks(updatedTasks);
    setChapterList(updatedChapters);
    persist("journal_entries", [journalRow(entry)]);
    persist("chapter_progress", [chapterRow(updatedChapter)]);
    persist("study_tasks", updatedTasks.filter((task) => task.id === entry.taskId || task.id === recommended?.id).map(taskRow));
    if (nextMistakes !== mistakes) {
      const mistake = nextMistakes[0];
      setMistakes(nextMistakes);
      persist("mistakes", [mistakeRow(mistake)]);
    }
    if ((taskById(updatedTasks, entry.taskId)?.focusedSeconds ?? 0) > 0) {
      const focusedSeconds = taskById(updatedTasks, entry.taskId)?.focusedSeconds ?? 0;
      saveSession({ id: crypto.randomUUID(), taskId: entry.taskId, subjectId: entry.subjectId, chapterId: entry.chapterId, mode: "focus", startedAt: new Date(new Date(entry.createdAt).getTime() - focusedSeconds * 1000).toISOString(), endedAt: entry.createdAt, focusedSeconds, pauseSeconds: 0, completed: true, questionsAttempted: entry.attempted, questionsCorrect: entry.correct });
    }
    setJournalTask(null);
    setActive("Home");
  };

  const saveMock = (result: MockResult) => {
    setMocks([result, ...mocks]);
    persist("mock_results", [{ id: result.id, subject_id: result.subjectId, paper_type: result.paperType, score: result.score, total: result.total, duration_minutes: result.durationMinutes ?? null, taken_at: result.takenAt }]);
    setMockOpen(false);
  };

  const recordRevision = (mistake: Mistake, outcome: "solved" | "needs-work", note: string) => {
    const nextCount = (mistake.revisionCount ?? 0) + 1;
    const solved = outcome === "solved";
    const updated = { ...mistake, resolved: solved, revisionCount: nextCount, lastReattemptedAt: new Date().toISOString(), reattemptDate: solved ? "" : new Date(Date.now() + revisionDelayDays(nextCount) * 86400000).toISOString().slice(0, 10), lastAttemptNote: note || mistake.lastAttemptNote };
    setMistakes(mistakes.map((item) => item.id === mistake.id ? updated : item));
    persist("mistakes", [mistakeRow(updated)]);
    setRevisionMistake(null);
  };

  const planToday = (availableMinutes: number) => {
    const dayMinutes = new Date().getDay() === 0 || new Date().getDay() === 6 ? learningPreferences.weekendMinutes : learningPreferences.weekdayMinutes;
    const result = buildAdaptivePlan({ tasks, chapters: chapterList, preferences, mistakes, mocks, subjects, settings: planning, availableMinutes: availableMinutes || dayMinutes, learningPreferences, assessments: subjectAssessments, feedback: recommendationFeedback });
    const summary: AdaptivePlanSummary = { usedMinutes: result.usedMinutes, availableMinutes: result.availableMinutes, deferredCount: result.deferredCount, generatedRevisionCount: result.generatedRevisionCount, rationale: result.rationale, plannedAt: new Date().toISOString() };
    setTasks(result.tasks);
    setPlanSummary(summary);
    persist("study_tasks", result.tasks.map(taskRow));
    persist("adaptive_plan_summaries", [adaptivePlanRow(summary)]);
    setActive("Home");
  };

  const openJournal = () => {
    const openTask = tasks.find((task) => task.status !== "completed" && task.status !== "skipped" && !preferenceFor(task.chapterId, preferences).excluded && isTaskAvailable(task));
    if (openTask) return setJournalTask(openTask);
    const chapter = chapterList.find((item) => !preferenceFor(item.id, preferences).excluded) ?? chapterList[0];
    if (!chapter) return;
    setJournalTask({ id: "", subjectId: chapter.subjectId, chapterId: chapter.id, title: chapter.title, plannedTime: "Unscheduled", duration: 45, origin: "manual", pinned: false, status: "planned", currentStep: 0, reason: "Manual journal evidence", priorityScore: 0, focusedSeconds: 0 });
  };
  if (databaseStatus !== "ready") return <DatabaseGate status={databaseStatus} error={databaseError} />;
  if (!profile) return <DatabaseGate status="loading" error="Preparing your private workspace…" />;
  if (!profile.onboardingCompleted) return <OnboardingWizard profile={profile} subjects={subjects} save={saveProfile} saveAdaptive={saveAdaptiveProfile} startPlan={() => planToday(learningPreferences.weekdayMinutes)} />;
  const adaptiveRiskSubject = subjects.filter((subject) => learningPreferences.userId ? subjectAssessments.some((assessment) => assessment.subjectId === subject.id) : false).map((subject) => ({ subject, assessment: subjectAssessments.find((assessment) => assessment.subjectId === subject.id)! })).sort((a, b) => (b.assessment.difficulty + b.assessment.priority) - (a.assessment.difficulty + a.assessment.priority))[0]?.subject.name ?? "Your next priority";
  const home = <Home tasks={tasks} chapters={chapterList} preferences={preferences} mistakes={mistakes} entries={entries} examEvents={examEvents} update={updateTask} remove={removeTaskFromToday} journal={setJournalTask} add={() => openManual()} focusTaskId={focusTaskId} planSummary={planSummary} planToday={planToday} go={setActive} feedback={recordFeedback} adaptiveRiskSubject={adaptiveRiskSubject} />;
  const content = (() => {
    switch (active) {
      case "Home":
      case "Dashboard":
      case "Today": return home;
      case "Syllabus": return <Syllabus list={chapterList} setList={setChapterList} preferences={preferences} updatePreference={updatePreference} completeChapter={completeChapter} persistProgress={(chapter) => persist("chapter_progress", [chapterRow(chapter)])} goGoals={() => setActive("Goals")} sessions={sessions} entries={entries} mistakes={mistakes} resources={resources} goResources={(chapterId) => { setResourceChapterId(chapterId); setActive("Resources"); }} />;
      case "Goals": return <Goals list={chapterList} preferences={preferences} updatePreference={updatePreference} updatePreferences={updatePreferences} completeChapter={completeChapter} buildQueue={buildGoalQueue} />;
      case "Calendar": return <StudyCalendar tasks={tasks} preferences={preferences} update={updateTask} add={openManual} openTask={(task) => { setFocusTaskId(task.id); setActive("Home"); }} />;
      case "Journal": return <Journal entries={entries} add={openJournal} />;
      case "Progress": return <Progress entries={entries} list={chapterList} mocks={mocks} addMock={() => setMockOpen(true)} sessions={sessions} tasks={tasks} />;
      case "Maths Lab": return <MathsLab mistakes={mistakes} chapters={chapterList} review={setRevisionMistake} goToday={() => setActive("Home")} />;
      case "Exam Mode": return <ExamModeFocus tasks={tasks} activeTaskId={focusTaskId} onClose={() => setActive("Home")} onSaveSession={saveSession} onUpdateTask={updateTask} />;
      case "Resources": return <ResourceLibrary resources={resources.filter((resource) => !resource.archived)} chapters={chapterList} initialChapterId={resourceChapterId} save={saveResource} remove={removeResource} />;
      case "Countdown": return <ExamCountdownCenter events={examEvents} saveEvents={saveExamEvents} chapters={chapterList} tasks={tasks} entries={entries} goToday={() => setActive("Home")} />;
      case "Exam Plan": return <ExamPlan />;
      default: return <Settings planning={planning} setPlanning={updatePlanning} profile={profile} saveProfile={saveProfile} learningPreferences={learningPreferences} saveAdaptive={saveAdaptiveProfile} />;
    }
  })();

  return <div className="app-shell">
    <button className="skip-link" onClick={() => document.querySelector("main")?.focus()}>Skip to main content</button>
    <Sidebar active={active} setActive={setActive} open={menu} close={() => setMenu(false)} />
    {menu && <button className="mobile-scrim" onClick={() => setMenu(false)} aria-label="Close navigation" />}
    <div className="workspace"><Topbar active={active} open={() => setMenu(true)} expanded={menu} profile={profile} /><div className="page-transition" key={active}>{content}</div></div>
    <nav className="bottom-nav">{[["Home", House], ["Goals", Target], ["Countdown", Timer], ["Settings", SlidersHorizontal]].map(([label, Icon]) => <button key={String(label)} aria-label={String(label)} aria-current={active === label ? "page" : undefined} className={active === label ? "active" : ""} onClick={() => setActive(String(label))}><Icon size={22} weight={active === label ? "fill" : "regular"} /></button>)}</nav>
    {manualOpen && <ManualTaskModal close={() => { setManualOpen(false); setManualDate(undefined); }} save={addTask} defaultDate={manualDate} preferences={preferences} />}
    {journalTask && <JournalModal task={journalTask} close={() => setJournalTask(null)} save={save} />}
    {mockOpen && <MockResultModal close={() => setMockOpen(false)} save={saveMock} />}
    {revisionMistake && <RevisionModal mistake={revisionMistake} close={() => setRevisionMistake(null)} save={(outcome, note) => recordRevision(revisionMistake, outcome, note)} />}
    <p className="sr-only" aria-live="polite">{manualOpen ? "Add task dialog opened" : journalTask ? "Session journal opened" : mockOpen ? "Mock result dialog opened" : revisionMistake ? "Revision attempt dialog opened" : ""}</p>
  </div>;
}
