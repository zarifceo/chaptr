"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise, ArrowRight, BookOpen, Books, Brain, CalendarBlank, CalendarPlus, CaretDown, CaretLeft, CaretRight,
  ChartBar, Check, CheckCircle, Clock, CloudCheck, Exam, Headphones, House,
  EyeSlash, ListChecks, MagnifyingGlass, NotePencil, Pause, Play, Plus, PushPin, Rows,
  Sigma, SignIn, SignOut, SlidersHorizontal, Sparkle, Target, Timer, Warning, X,
} from "@phosphor-icons/react";
import {
  chapters as seedChapters, exams, marksDistributions, subjects, workflowSteps,
} from "@/lib/academic-data";
import { flushCloudSync, getPendingSyncCount, installOnlineSync, queueCloudSync } from "@/lib/offline-sync";
import { recommendTasks } from "@/lib/recommendations";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { Chapter, ChapterPreference, JournalEntry, Mistake, MockResult, PlanningSettings, StudyTask } from "@/lib/types";

const nav = [
  ["Dashboard", House], ["Today", CalendarBlank], ["Syllabus", Books],
  ["Goals", Target], ["Calendar", CalendarPlus], ["Journal", NotePencil], ["Progress", ChartBar], ["Maths Lab", Sigma],
  ["Exam Plan", Exam], ["Settings", SlidersHorizontal],
] as const;

const bySubject = (id: string) => subjects.find((subject) => subject.id === id)!;
const byChapter = (id: string, list = seedChapters) => list.find((chapter) => chapter.id === id)!;
const times = ["3:00 PM", "4:15 PM", "5:30 PM", "8:00 PM", "9:45 PM"];
const rankedTasks = recommendTasks(subjects, seedChapters);
const dailyMix = [rankedTasks.find((task) => task.subjectId === "mathematics")!, rankedTasks.find((task) => task.subjectId === "agriculture")!, rankedTasks.find((task) => task.subjectId === "accounting")!, rankedTasks.filter((task) => task.subjectId === "mathematics")[1], rankedTasks.find((task) => ["bangla-1", "bangla-2", "science", "business", "finance", "ict", "islam"].includes(task.subjectId))!];
const seededTasks = dailyMix.map((task, index) => ({ ...task, plannedTime: times[index] }));
const seededMistakes: Mistake[] = [
  { id: "m1", chapterId: seedChapters.find((c) => c.subjectId === "mathematics" && c.number === 3)!.id, prompt: "Factorise without checking the guide.", errorType: "Sign error", reattemptDate: "2026-08-14", resolved: false },
  { id: "m2", chapterId: seedChapters.find((c) => c.subjectId === "mathematics" && c.number === 9)!.id, prompt: "Choose the correct ratio from the diagram.", errorType: "Concept selection", reattemptDate: "2026-08-14", resolved: false },
  { id: "m3", chapterId: seedChapters.find((c) => c.subjectId === "mathematics" && c.number === 8)!.id, prompt: "Prove the theorem with complete reasoning.", errorType: "Missing step", reattemptDate: "2026-08-15", resolved: false },
];
const officialExamTotals: Record<string, number> = { "bangla-1": 100, "bangla-2": 100, "english-1": 100, "english-2": 100, mathematics: 100, science: 100, islam: 100, ict: 50, accounting: 100, finance: 100, business: 100 };
const defaultPlanning: PlanningSettings = { mainStart: "15:00", mainEnd: "19:00", mathStart: "20:00", mathEnd: "22:00", dailyTarget: 240, mathDaysPerWeek: 6, agricultureDaysPerWeek: 4, remindersEnabled: false };
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

function useStored<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(key);
      if (raw) { try { setValue(JSON.parse(raw) as T); } catch { window.localStorage.setItem(key, JSON.stringify(seed)); } }
      else window.localStorage.setItem(key, JSON.stringify(seed));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, seed]);
  useEffect(() => { if (hydrated) localStorage.setItem(key, JSON.stringify(value)); }, [hydrated, key, value]);
  return [value, setValue] as const;
}

function dhakaDate() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
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
    id: entry.id, task_id: entry.taskId, subject_id: entry.subjectId, chapter_id: entry.chapterId,
    learning_goal: entry.learningGoal, resources: entry.resources, minutes: entry.minutes,
    attempted: entry.attempted, correct: entry.correct, confidence_before: entry.confidenceBefore,
    confidence_after: entry.confidenceAfter, mistakes_text: entry.mistakesText ?? null,
    written_score: entry.writtenScore ?? null, reflection: entry.reflection,
    next_action: entry.nextAction, created_at: entry.createdAt,
  };
}

function Sidebar({ active, setActive, open, close }: { active: string; setActive: (value: string) => void; open: boolean; close: () => void }) {
  return <aside className={`sidebar ${open ? "is-open" : ""}`}>
    <button className="close-menu" onClick={close} aria-label="Close navigation"><X /></button>
    <button className="brand" onClick={() => setActive("Dashboard")}>
      <Image src="/icon-512.png" width={44} height={44} alt="SSC Command Center" priority />
      <div><strong>SSC</strong><small>Command Center</small></div>
    </button>
    <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => { setActive(label); close(); }}><Icon size={21} weight={active === label ? "fill" : "regular"} /><span>{label}</span></button>)}</nav>
    <div className="sync-pill"><CloudCheck size={20} weight="fill" /><span><strong>Offline-ready</strong><small>Syncs when signed in</small></span></div>
  </aside>;
}

function Topbar({ active, open }: { active: string; open: () => void }) {
  return <header className="topbar">
    <button className="menu-button" onClick={open} aria-label="Open navigation"><Image src="/icon-192.png" width={28} height={28} alt="" /></button>
    <div><p>{dhakaDate()}</p><h1>{active === "Today" ? "Today's learning journey" : active}</h1></div>
    <div className="profile"><span>ZI</span><div><strong>Zarif</strong><small>SSC 2027</small></div></div>
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

function Dashboard({ tasks, chapters, preferences, mistakes, entries, go }: { tasks: StudyTask[]; chapters: Chapter[]; preferences: ChapterPreference[]; mistakes: Mistake[]; entries: JournalEntry[]; go: (value: string) => void }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const first = visible[0] ?? seededTasks[0];
  const subject = bySubject(first.subjectId);
  const chapter = byChapter(first.chapterId);
  const readiness = (subjectId: string) => { const mine = chapters.filter((item) => item.subjectId === subjectId); return mine.length ? Math.round(mine.reduce((sum, item) => sum + item.confidence, 0) / (mine.length * 5) * 100) : 0; };
  const writtenPractice = Math.min(100, entries.filter((entry) => ["bangla-1", "bangla-2", "accounting"].includes(entry.subjectId)).length * 12);
  const strongIds = subjects.filter((item) => item.strength === "strongest" || item.strength === "very-strong").map((item) => item.id);
  const strongReadiness = Math.round(strongIds.reduce((sum, id) => sum + readiness(id), 0) / strongIds.length);
  const weeklyBars: [string, number, string][] = [["Mathematics", readiness("mathematics"), "lilac"], ["Agriculture", readiness("agriculture"), "mint"], ["Written practice", writtenPractice, "pink"], ["Strong subjects", strongReadiness, "yellow"]];
  const openMaths = mistakes.filter((item) => !item.resolved).length;
  return <main id="main-content" tabIndex={-1} className="page dashboard-page">
    <section className="hero-grid">
      <article className="priority-hero">
        <div className="eyebrow"><Sparkle weight="fill" />BEST NEXT MOVE</div>
        <h2>{subject.shortName}</h2>
        <p>{chapter.number ? `Chapter ${chapter.number} · ` : ""}{chapter.title}</p>
        <div className="chips"><span>{first.reason.split(" · ")[0]}</span><span>{first.priorityScore} priority</span><span>{first.duration} min</span></div>
        <button className="solid-cta" onClick={() => go("Today")}><Play weight="fill" />Start study flow</button>
        <Brain className="hero-art" weight="duotone" />
      </article>
      <div className="countdown-stack"><Countdown name="Full-Syllabus Test" date={exams[0].start} tone="lilac" /><Countdown name="SSC 2027" date={exams[1].start} tone="mint" /></div>
    </section>
    <section className="strategy-ribbon"><button onClick={() => go("Goals")}><Target weight="fill" /><span><small>SSC STRATEGY</small><strong>{preferences.filter((item) => item.includedForSsc && !item.excluded).length} selected</strong></span><CaretRight /></button><button onClick={() => go("Goals")}><CalendarPlus weight="fill" /><span><small>{monthLabel(currentMonthKey()).toUpperCase()}</small><strong>{preferences.filter((item) => item.targetMonth === currentMonthKey() && !item.excluded).length} chapter goals</strong></span><CaretRight /></button><button onClick={() => go("Syllabus")}><EyeSlash weight="fill" /><span><small>STRATEGICALLY SKIPPED</small><strong>{preferences.filter((item) => item.excluded).length} excluded</strong></span><CaretRight /></button></section>
    <section className="dashboard-grid">
      <article className="panel weekly"><SectionTitle kicker="LIVE EVIDENCE" title="Work that protects your result" /><div className="bars">{weeklyBars.map(([label, value, tone]) => <div key={label}><span>{label}</span><i><b className={tone} style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>)}</div></article>
      <article className="panel risks"><SectionTitle kicker="URGENT" title="Repair queue"><Warning weight="fill" /></SectionTitle>{[["Maths", `${openMaths} open mistake${openMaths === 1 ? "" : "s"} need reattempts`, "lilac"], ["Agriculture", `${readiness("agriculture")}% readiness · deliberate exposure`, "mint"], ["Accounting", `${readiness("accounting")}% readiness · concepts plus practice`, "yellow"]].map(([name, note, tone]) => <button key={name} onClick={() => go(name === "Maths" ? "Maths Lab" : "Syllabus")}><i className={tone} /><span><strong>{name}</strong><small>{note}</small></span><CaretRight /></button>)}</article>
    </section>
    <section className="panel queue"><SectionTitle kicker="TODAY" title="Recommended queue"><button onClick={() => go("Today")}>Open full day <ArrowRight /></button></SectionTitle>{visible.slice(0, 4).map((task, index) => <div key={task.id}><span className={`number ${bySubject(task.subjectId).accent}`}>{index + 1}</span><p><strong>{bySubject(task.subjectId).shortName}</strong><small>{task.title}</small></p><time>{task.plannedTime}</time><b>{task.duration}m</b></div>)}</section>
  </main>;
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

function Today({ tasks, preferences, update, remove, journal, add }: { tasks: StudyTask[]; preferences: ChapterPreference[]; update: (task: StudyTask) => void; remove: (task: StudyTask) => void; journal: (task: StudyTask) => void; add: () => void }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const [expanded, setExpanded] = useState(visible[0]?.id ?? "");
  const advance = (task: StudyTask, total: number) => {
    if (task.currentStep + 1 >= total) return journal(task);
    update({ ...task, currentStep: task.currentStep + 1, status: "in-progress" });
  };
  return <main id="main-content" tabIndex={-1} className="page today-page">
    <section className="journey">
      <SectionTitle kicker="YOUR PLAN ADAPTS — NO PUNISHMENT FOR MISSED DAYS" title="Study timeline"><button className="add-task" onClick={add}><Plus />Add task</button></SectionTitle>
      <div className="timeline">{visible.length ? visible.map((task, index) => {
        const subject = bySubject(task.subjectId);
        const steps = [...workflowSteps[subject.workflow]];
        const open = expanded === task.id;
        return <article className={`timeline-task ${subject.accent} ${open ? "open" : ""}`} key={task.id}>
          <time>{task.plannedTime}</time><span className="timeline-rail"><i /></span>
          <div className="task-card">
            <div className="task-heading"><button className="task-summary" onClick={() => setExpanded(open ? "" : task.id)}><span className="subject-token">{subject.shortName.slice(0, 2)}</span><p><small>{index + 1}. {subject.shortName}{task.pinned ? " · PINNED" : ""}</small><strong>{task.title}</strong><em>{task.reason} · {task.duration} min</em></p><CaretDown /></button><button className="remove-today" onClick={() => remove(task)} aria-label={`Remove ${task.title} from today's timeline`} title="Remove from today"><X /></button></div>
            {open && <div className="steps">
              <FocusTimer seconds={task.focusedSeconds ?? 0} onChange={(focusedSeconds) => update({ ...task, focusedSeconds, status: focusedSeconds ? "in-progress" : task.status })} />
              <div className="task-actions"><button className={task.pinned ? "pinned" : ""} onClick={() => update({ ...task, pinned: !task.pinned, priorityScore: task.pinned ? task.priorityScore : 100 })}><PushPin weight={task.pinned ? "fill" : "regular"} />{task.pinned ? "Pinned" : "Pin first"}</button><label><span className="sr-only">Study time</span><input value={task.plannedTime} onChange={(event) => update({ ...task, plannedTime: event.target.value })} aria-label="Study time" /></label><button onClick={() => update({ ...task, status: "planned", plannedTime: "Tomorrow", deferredUntil: new Date(Date.now() + 86400000).toISOString() })}>Move to tomorrow</button></div>
              {steps.map((name, step) => <StudyStep key={name} name={name} index={step} current={task.currentStep} onAdvance={() => advance(task, steps.length)} />)}
              <button className="finish" onClick={() => journal(task)}><NotePencil />Finish with journal</button>
            </div>}
          </div>
        </article>;
      }) : <article className="empty-day"><CheckCircle weight="fill" /><h3>Today&apos;s open queue is clear.</h3><p>Add a manual task or let tomorrow&apos;s recommendations refill it.</p><button className="solid-cta" onClick={add}><Plus />Add a task</button></article>}</div>
    </section>
    <aside className="today-aside"><Countdown name="Test exam" date={exams[0].start} tone="lilac" /><article className="mini-card"><small>TODAY&apos;S TARGET</small><h3>{visible.reduce((sum, task) => sum + task.duration, 0)}<em> min</em><b>{tasks.length ? Math.round(tasks.filter((task) => task.status === "completed").length / tasks.length * 100) : 0}%</b></h3><i className="meter" /></article><article className="mini-card risk"><small>RISK INSIGHT</small><h3>Maths stays near-daily.</h3><p>Only correct-without-help closes a mistake.</p></article><article className="mini-card"><small>WHY THESE TASKS?</small><p>30% urgency · 25% weakness · 20% mastery · 15% review · 10% evidence</p></article></aside>
  </main>;
}

function Syllabus({ list, setList, preferences, updatePreference, goGoals }: { list: Chapter[]; setList: (value: Chapter[]) => void; preferences: ChapterPreference[]; updatePreference: (value: ChapterPreference) => void; goGoals: () => void }) {
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
    void queueCloudSync("chapter_progress", [chapterRow(updated)]);
  };
  const setConfidence = (chapter: Chapter, confidence: Chapter["confidence"]) => {
    const updated = { ...chapter, confidence };
    setList(list.map((item) => item.id === chapter.id ? updated : item));
    void queueCloudSync("chapter_progress", [chapterRow(updated)]);
  };
  const listedTotal = marks.reduce((sum, item) => sum + item.marks, 0);
  const officialTotal = officialExamTotals[selected];
  const hasConflict = Boolean(officialTotal && listedTotal && listedTotal !== officialTotal);
  return <main id="main-content" tabIndex={-1} className="page syllabus-page">
    <section className="subject-strip" aria-label="Subjects">{subjects.map((item) => <button key={item.id} className={selected === item.id ? `active ${item.accent}` : ""} onClick={() => setSelected(item.id)}><span>{item.shortName.slice(0, 2)}</span><strong>{item.shortName}</strong><small>{list.filter((chapter) => chapter.subjectId === item.id).length} topics</small></button>)}</section>
    <section className="syllabus-layout"><div><SectionTitle kicker={`${subject.strength.replace("-", " ")} · ${subject.workflow === "accounting" ? "separate accounting workflow" : subject.workflow}`} title={subject.name}><div className="syllabus-tools"><label className="search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a chapter" aria-label="Find a chapter" /></label><button className={showExcluded ? "active" : ""} onClick={() => setShowExcluded(!showExcluded)}><EyeSlash />{showExcluded ? "Hide excluded" : "Show excluded"}</button><button onClick={goGoals}><Target />Plan goals</button></div></SectionTitle><div className="chapters">{mine.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); return <article className={preference.excluded ? "excluded" : ""} key={chapter.id}><span className={`number ${subject.accent}`}>{chapter.number ?? "•"}</span><p><strong>{chapter.title}</strong><small>{preference.excluded ? `Excluded${preference.exclusionReason ? ` · ${preference.exclusionReason}` : ""}` : [chapter.division, chapter.note].filter(Boolean).join(" · ") || chapter.formats.join(" · ")}</small></p><div className="chapter-actions"><button className={preference.targetMonth === currentMonthKey() ? "selected" : ""} onClick={() => updatePreference({ ...preference, excluded: false, targetMonth: preference.targetMonth === currentMonthKey() ? undefined : currentMonthKey() })}>Month</button><button className={preference.includedForSsc ? "selected" : ""} onClick={() => updatePreference({ ...preference, excluded: false, includedForSsc: !preference.includedForSsc })}>SSC</button><button className={preference.excluded ? "danger selected" : "danger"} onClick={() => updatePreference({ ...preference, excluded: !preference.excluded, includedForSsc: preference.excluded ? preference.includedForSsc : false, targetMonth: preference.excluded ? preference.targetMonth : undefined, exclusionReason: preference.excluded ? undefined : "Strategic skip" })} aria-label={preference.excluded ? `Restore ${chapter.title}` : `Exclude ${chapter.title}`}>{preference.excluded ? <ArrowCounterClockwise /> : <EyeSlash />}</button></div><button className={`status ${chapter.status}`} onClick={() => cycle(chapter)} aria-label={`Change status for ${chapter.title}`}>{chapter.status.replace("-", " ")}</button><span className="confidence" role="group" aria-label={`Confidence for ${chapter.title}`}>{([1, 2, 3, 4, 5] as const).map((n) => <button type="button" className={n <= chapter.confidence ? "on" : ""} key={n} onClick={() => setConfidence(chapter, n)} aria-label={`Set confidence to ${n} out of 5`} aria-pressed={chapter.confidence === n} />)}</span></article>; })}</div></div><aside className="marks"><small>OFFICIAL QUESTION-TYPE DISTRIBUTION</small><h3>{officialTotal ? `${officialTotal} marks` : marks.length ? `${listedTotal} marks listed` : "Pattern pending"}</h3>{hasConflict && <p className="source-warning"><Warning weight="fill" />The source says {officialTotal} total, while its listed rows add to {listedTotal}. Kept visible for confirmation; no chapter marks were invented.</p>}{marks.length ? marks.map((mark) => <div key={`${mark.part}-${mark.questionType}`}><p><strong>{mark.questionType}</strong><small>{mark.rule}</small></p><b>{mark.marks}</b></div>) : <p>No complete readable Agriculture marks table was available. No chapter weights have been invented.</p>}</aside></section>
  </main>;
}

function GoalMetrics({ chapters }: { chapters: Chapter[] }) {
  const ready = chapters.filter((chapter) => chapter.status === "exam-ready").length;
  const active = chapters.filter((chapter) => chapter.status !== "not-started" && chapter.status !== "exam-ready").length;
  const left = chapters.filter((chapter) => chapter.status === "not-started").length;
  const percent = chapters.length ? Math.round(ready / chapters.length * 100) : 0;
  return <div className="goal-metrics"><article><small>Selected</small><strong>{chapters.length}</strong></article><article><small>Exam-ready</small><strong>{ready}</strong></article><article><small>In progress</small><strong>{active}</strong></article><article><small>Left</small><strong>{left}</strong></article><article className="wide"><small>Completion</small><i><b style={{ width: `${percent}%` }} /></i><strong>{percent}%</strong></article></div>;
}

function Goals({ list, preferences, updatePreference, buildQueue }: { list: Chapter[]; preferences: ChapterPreference[]; updatePreference: (value: ChapterPreference) => void; buildQueue: (chapters: Chapter[], label: string) => void }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [subjectId, setSubjectId] = useState("all");
  const [mode, setMode] = useState<"monthly" | "ssc" | "excluded">("monthly");
  const monthly = list.filter((chapter) => preferenceFor(chapter.id, preferences).targetMonth === month && !preferenceFor(chapter.id, preferences).excluded);
  const ssc = list.filter((chapter) => preferenceFor(chapter.id, preferences).includedForSsc && !preferenceFor(chapter.id, preferences).excluded);
  const excluded = list.filter((chapter) => preferenceFor(chapter.id, preferences).excluded);
  const selected = mode === "monthly" ? monthly : mode === "ssc" ? ssc : excluded;
  const candidates = list.filter((chapter) => subjectId === "all" || chapter.subjectId === subjectId);
  const deadline = mode === "monthly" ? new Date(new Date(`${month}T00:00:00+06:00`).getFullYear(), new Date(`${month}T00:00:00+06:00`).getMonth() + 1, 0) : new Date("2027-01-07T00:00:00+06:00");
  const weeks = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 604800000));
  const remaining = selected.filter((chapter) => chapter.status !== "exam-ready").length;
  const pace = Math.ceil(remaining / weeks);
  const toggle = (chapter: Chapter) => {
    const preference = preferenceFor(chapter.id, preferences);
    if (mode === "monthly") updatePreference({ ...preference, excluded: false, exclusionReason: undefined, targetMonth: preference.targetMonth === month ? undefined : month });
    else if (mode === "ssc") updatePreference({ ...preference, excluded: false, exclusionReason: undefined, includedForSsc: !preference.includedForSsc });
    else updatePreference({ ...preference, excluded: !preference.excluded, includedForSsc: preference.excluded ? preference.includedForSsc : false, targetMonth: preference.excluded ? preference.targetMonth : undefined, exclusionReason: preference.excluded ? undefined : "Strategic skip" });
  };
  return <main id="main-content" tabIndex={-1} className="page goals-page">
    <SectionTitle kicker="BUILD THE SYLLABUS YOU WILL ACTUALLY STUDY" title="Strategic chapter goals"><span><Target weight="fill" />{pace} chapter{pace === 1 ? "" : "s"}/week needed</span></SectionTitle>
    <section className="goal-controls"><div className="segmented">{(["monthly", "ssc", "excluded"] as const).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)}>{item === "monthly" ? "Monthly goal" : item === "ssc" ? "Before SSC" : "Excluded"}</button>)}</div>{mode === "monthly" && <label>Target month<input type="month" value={month.slice(0, 7)} onChange={(event) => setMonth(`${event.target.value}-01`)} /></label>}<label>Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label></section>
    <GoalMetrics chapters={selected} />
    <section className="goal-layout"><article className="panel goal-selected"><SectionTitle kicker={mode === "monthly" ? monthLabel(month) : mode === "ssc" ? "SSC 2027 TARGET SET" : "REVERSIBLE STRATEGIC SKIPS"} title={mode === "excluded" ? "Chapters you chose not to prepare" : "Selected chapters"}>{mode !== "excluded" && selected.length > 0 && <button className="accent" onClick={() => buildQueue(selected, mode === "monthly" ? `${monthLabel(month)} goal` : "SSC target")}><ListChecks />Build next 5</button>}</SectionTitle>{selected.length ? selected.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); return <div className="goal-row" key={chapter.id}><span className={`number ${bySubject(chapter.subjectId).accent}`}>{chapter.number ?? "•"}</span><p><strong>{chapter.title}</strong><small>{bySubject(chapter.subjectId).shortName} · {chapter.status.replace("-", " ")}</small></p>{mode !== "excluded" && <label className="priority-control">Priority<select value={preference.priority} onChange={(event) => updatePreference({ ...preference, priority: Number(event.target.value) as ChapterPreference["priority"] })}>{[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level}</option>)}</select></label>}<button onClick={() => toggle(chapter)}>{mode === "excluded" ? <><ArrowCounterClockwise />Restore</> : "Remove"}</button></div>; }) : <div className="empty compact"><Target /><h3>No chapters selected yet.</h3><p>Choose only the chapters that belong in this campaign.</p></div>}</article><aside className="panel goal-picker"><SectionTitle kicker="CHAPTER PICKER" title="Add or remove" />{candidates.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); const chosen = mode === "monthly" ? preference.targetMonth === month : mode === "ssc" ? preference.includedForSsc : preference.excluded; return <button className={chosen ? "chosen" : ""} key={chapter.id} onClick={() => toggle(chapter)}><span>{bySubject(chapter.subjectId).shortName}</span><p><strong>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</strong><small>{preference.excluded && mode !== "excluded" ? "Excluded · select to restore and add" : chosen ? "Selected" : "Not selected"}</small></p>{chosen ? <CheckCircle weight="fill" /> : <Plus />}</button>; })}</aside></section>
  </main>;
}

type CalendarHealth = { authenticated: boolean; configured: boolean; connected: boolean; lastSuccessfulSync?: string | null; linkedEvents?: number; missing?: string[] };

function StudyCalendar({ tasks, preferences, update, add, openTask }: { tasks: StudyTask[]; preferences: ChapterPreference[]; update: (task: StudyTask) => void; add: (date?: string) => void; openTask: () => void }) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());
  const [health, setHealth] = useState<CalendarHealth | null>(null);
  const [syncing, setSyncing] = useState(false);
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const activeTasks = tasks.filter((task) => !excluded.has(task.chapterId) && task.status !== "skipped");
  useEffect(() => { void fetch("/api/calendar/status").then((response) => response.json()).then(setHealth).catch(() => setHealth(null)); }, []);
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
    const response = await fetch("/api/calendar/sync", { method: "POST" }).catch(() => null);
    setSyncing(false);
    if (response?.ok) location.reload();
    else setHealth((current) => current ? { ...current, connected: false } : current);
  };
  return <main id="main-content" tabIndex={-1} className="page calendar-page">
    <SectionTitle kicker="APP-OWNED STUDY BLOCKS ONLY" title="Study calendar"><div className="calendar-actions"><button onClick={() => moveMonth(-1)} aria-label="Previous month"><CaretLeft /></button><strong>{monthLabel(month)}</strong><button onClick={() => moveMonth(1)} aria-label="Next month"><CaretRight /></button><button className="accent" onClick={() => add()}><Plus />Add task</button></div></SectionTitle>
    <section className={`calendar-health ${health?.connected ? "ok" : "warn"}`}><CalendarBlank weight="fill" /><p><strong>{health?.connected ? "Google Calendar connected" : health?.authenticated ? health?.configured ? "Google Calendar is ready to connect" : "Calendar configuration is incomplete" : "Sign in to enable Google Calendar"}</strong><small>{health?.connected ? `${health.linkedEvents ?? 0} linked app event${health.linkedEvents === 1 ? "" : "s"}${health.lastSuccessfulSync ? ` · last sync ${new Date(health.lastSuccessfulSync).toLocaleString("en-GB")}` : ""}` : health?.missing?.length ? `Missing: ${health.missing.join(", ")}` : "Your in-app calendar works locally; cloud sync requires authentication."}</small></p><button disabled={syncing} onClick={health?.connected ? syncCalendar : () => router.push("/api/calendar/connect")}>{health?.connected ? syncing ? "Syncing…" : "Sync now" : "Connect"}</button></section>
    <section className="calendar-layout"><div className="month-grid"><div className="weekday-row">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div><div className="day-grid">{cells.map((day, index) => { if (!day) return <div className="day empty-cell" key={`blank-${index}`} />; const date = `${month.slice(0, 8)}${String(day).padStart(2, "0")}`; const items = activeTasks.filter((task) => plannedDate(task) === date); return <article className="day" key={date}><button className="day-number" onClick={() => add(date)}>{day}<Plus /></button>{items.slice(0, 3).map((task) => <button className={`calendar-task ${bySubject(task.subjectId).accent}`} key={task.id} onClick={openTask}><strong>{task.plannedTime}</strong><span>{bySubject(task.subjectId).shortName}</span></button>)}{items.length > 3 && <small>+{items.length - 3} more</small>}</article>; })}</div></div><aside className="panel unscheduled"><SectionTitle kicker="NEEDS A DATE" title={`${unscheduled.length} unscheduled`} />{unscheduled.slice(0, 12).map((task) => <div key={task.id}><p><strong>{task.title}</strong><small>{bySubject(task.subjectId).shortName} · {task.duration} min</small></p><input type="date" aria-label={`Schedule ${task.title}`} onChange={(event) => event.target.value && update(scheduleOn(task, event.target.value))} /></div>)}{!unscheduled.length && <div className="empty compact"><CheckCircle /><h3>Everything is placed.</h3><p>Move a task in Google Calendar, then sync to bring the change back.</p></div>}</aside></section>
  </main>;
}

function Journal({ entries, add }: { entries: JournalEntry[]; add: () => void }) {
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="YOUR EVIDENCE, NOT A STREAK" title="Study journal"><button className="accent" onClick={add}><Plus />Add entry</button></SectionTitle><section className="journal-grid">{entries.length ? entries.map((entry) => <article key={entry.id}><span>{bySubject(entry.subjectId).shortName}</span><h3>{byChapter(entry.chapterId).title}</h3><p>{entry.reflection}</p><div><b>{entry.minutes}m</b><b>{entry.correct}/{entry.attempted}</b><b>{entry.confidenceBefore}→{entry.confidenceAfter}</b></div><small>Next: {entry.nextAction}</small></article>) : <article className="empty"><NotePencil /><h3>Your journal starts after the first session.</h3><p>Finish a task to record accuracy, confidence, mistakes, reflection, and the next action.</p></article>}</section></main>;
}

function Progress({ entries, list, mocks, addMock }: { entries: JournalEntry[]; list: Chapter[]; mocks: MockResult[]; addMock: () => void }) {
  const studied = list.filter((chapter) => chapter.status !== "not-started").length;
  const ready = list.filter((chapter) => chapter.status === "exam-ready").length;
  const mathEntries = entries.filter((entry) => entry.subjectId === "mathematics");
  const mathsAccuracy = mathEntries.reduce((sum, entry) => sum + entry.attempted, 0) ? Math.round(mathEntries.reduce((sum, entry) => sum + entry.correct, 0) / mathEntries.reduce((sum, entry) => sum + entry.attempted, 0) * 100) : 0;
  const latestMock = [...mocks].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="RESULTS OVER BUSYWORK" title="Progress intelligence"><button className="accent" onClick={addMock}><Plus />Record mock</button></SectionTitle><section className="metrics">{[["Coverage", `${Math.round(studied / list.length * 100)}%`, "lilac"], ["Exam-ready", ready, "mint"], ["Journal entries", entries.length, "yellow"], [latestMock ? "Latest mock" : "Maths accuracy", latestMock ? `${Math.round(latestMock.score / latestMock.total * 100)}%` : `${mathsAccuracy}%`, "pink"]].map(([label, value, tone]) => <article className={String(tone)} key={label}><small>{label}</small><strong>{value}</strong><span>Current evidence</span></article>)}</section><section className="progress-layout"><section className="panel subject-progress"><SectionTitle kicker="SUBJECT READINESS" title="Where attention is buying marks" />{subjects.map((subject) => { const mine = list.filter((chapter) => chapter.subjectId === subject.id); const score = Math.round(mine.reduce((sum, chapter) => sum + chapter.confidence, 0) / (mine.length * 5) * 100); return <div key={subject.id}><span>{subject.shortName}</span><i><b className={subject.accent} style={{ width: `${score}%` }} /></i><strong>{score}%</strong></div>; })}</section><aside className="panel mock-history"><SectionTitle kicker="EXAM EVIDENCE" title="Mock results" />{mocks.length ? [...mocks].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, 6).map((mock) => <article key={mock.id}><p><strong>{bySubject(mock.subjectId).shortName}</strong><small>{mock.paperType} · {new Date(mock.takenAt).toLocaleDateString("en-GB")}</small></p><b>{mock.score}/{mock.total}</b></article>) : <div className="empty compact"><Exam /><h3>No mock results yet.</h3><p>Record a full paper or timed section to strengthen recommendations.</p></div>}</aside></section></main>;
}

function MathsLab({ mistakes, resolve }: { mistakes: Mistake[]; resolve: (mistake: Mistake) => void }) {
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="CORRECT WITHOUT HELP TO CLOSE AN ITEM" title="Maths reattempt lab"><span className="open-count">{mistakes.filter((mistake) => !mistake.resolved).length} open</span></SectionTitle><section className="math-layout"><div className="mistakes">{mistakes.map((mistake, index) => <article className={mistake.resolved ? "resolved" : ""} key={mistake.id}><span>{index + 1}</span><p><small>{byChapter(mistake.chapterId).division} · {mistake.errorType}</small><strong>{mistake.prompt}</strong><em>{byChapter(mistake.chapterId).title}</em></p><button onClick={() => resolve(mistake)}>{mistake.resolved ? <><CheckCircle weight="fill" />Solved without help</> : <><Timer />Mark solved without help</>}</button></article>)}</div><aside className="division"><small>DIVISION COVERAGE</small>{["Algebra", "Geometry", "Trigonometry & Mensuration", "Statistics"].map((division) => <div key={division}><span>{division}</span><b>{seedChapters.filter((chapter) => chapter.subjectId === "mathematics" && chapter.division === division).length} chapters</b></div>)}</aside></section></main>;
}

function ExamPlan() {
  const phases = [{ date: "15 Aug—13 Sep", title: "Coverage & diagnostics", start: "2026-08-15", end: "2026-09-13" }, { date: "14 Sep—11 Oct", title: "Active recall & writing", start: "2026-09-14", end: "2026-10-11" }, { date: "12—27 Oct", title: "Test mock phase", start: "2026-10-12", end: "2026-10-27" }, { date: "28 Oct—12 Nov", title: "Test exam mode", start: "2026-10-28", end: "2026-11-12" }, { date: "13 Nov—10 Dec", title: "Result-driven repair", start: "2026-11-13", end: "2026-12-10" }, { date: "11 Dec—6 Jan", title: "SSC mock cycles", start: "2026-12-11", end: "2027-01-06" }, { date: "7 Jan—6 Feb", title: "SSC exam mode", start: "2027-01-07", end: "2027-02-06" }];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const current = Math.max(0, phases.findIndex((phase) => today >= phase.start && today <= phase.end));
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="TWO FULL-SYLLABUS DEADLINES" title="Exam campaign" /><section className="phases">{phases.map((phase, index) => <article className={index === current ? "current" : index < current ? "complete" : ""} key={phase.date}><span>{index < current ? <Check weight="bold" /> : index + 1}</span><p><small>{phase.date}</small><strong>{phase.title}</strong><em>{index === current ? (today < phase.start ? "Starts tomorrow: prepare the first diagnostic list." : "This is the active preparation stage.") : "Full-syllabus preparation stage."}</em></p>{index === current && <b>{today < phase.start ? "Starts next" : "Current phase"}</b>}</article>)}</section></main>;
}

function Settings({ planning, setPlanning }: { planning: PlanningSettings; setPlanning: (value: PlanningSettings) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(0);
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
    const refresh = () => void getPendingSyncCount().then(setPending);
    refresh();
    window.addEventListener("ssc-sync-queue-change", refresh);
    return () => window.removeEventListener("ssc-sync-queue-change", refresh);
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
  const signIn = async () => {
    const client = createSupabaseClient();
    if (!client) return setMessage("Add Supabase environment variables to enable cloud sign-in.");
    await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback?next=/`, scopes: "openid email profile" } });
  };
  const signOut = async () => { const client = createSupabaseClient(); await client?.auth.signOut(); setEmail(null); };
  const calendar = () => {
    if (!email) return setMessage("Sign in first, then connect Calendar.");
    if (!health?.configured) return setMessage(`Calendar setup is incomplete${health?.missing?.length ? `: ${health.missing.join(", ")}` : ""}. Add the missing server variables, then try again.`);
    router.push("/api/calendar/connect");
  };
  const syncNow = async () => {
    setMessage("Syncing saved study changes…");
    const local = await flushCloudSync();
    if (!email) return setMessage(`${local.pending} change${local.pending === 1 ? "" : "s"} safely queued. Sign in to send them to the cloud.`);
    const response = await fetch("/api/calendar/sync", { method: "POST" }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { synced?: number; error?: string } | null : null;
    setMessage(response?.ok ? `Cloud queue synced. Calendar checked ${body?.synced ?? 0} app-owned event${body?.synced === 1 ? "" : "s"}.` : body?.error ?? "Calendar is not connected yet. Your study data remains queued safely.");
    refreshHealth();
  };
  const enableReminders = async () => {
    if (!("Notification" in window)) return setMessage("This browser does not support notifications.");
    const permission = await Notification.requestPermission();
    setPlanning({ ...planning, remindersEnabled: permission === "granted" });
    setMessage(permission === "granted" ? "Reminders enabled. Calendar reminders remain the reliable option when the app is closed." : "Notification permission was not granted.");
  };
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="PRIVATE BY DEFAULT" title="Planning settings" /><section className="settings">
    <article className="auth-card"><span className="lilac"><CloudCheck /></span><p><strong>{email ? "Cloud account connected" : "Cloud account"}</strong><small>{email ?? "Sign in once to sync phone and desktop."}</small></p><button onClick={email ? signOut : signIn}>{email ? <><SignOut />Sign out</> : <><SignIn />Sign in with Google</>}</button></article>
    <article><span className="lilac"><CalendarBlank /></span><p><strong>{health?.connected ? "Google Calendar connected" : "Google Calendar"}</strong><small>{health?.connected ? `${health.linkedEvents ?? 0} linked study blocks. Unrelated events stay untouched.` : health?.configured ? "Ready to connect app-owned study blocks." : health?.missing?.length ? `Setup missing: ${health.missing.join(", ")}` : "Sync only app-owned study blocks. Unrelated events stay untouched."}</small></p><div className="settings-actions"><button className={health?.connected ? "connected" : ""} onClick={calendar}>{health?.connected ? "Reconnect" : "Connect"}</button><button onClick={syncNow}>Sync now</button></div></article>
    <article className="settings-editor"><span className="mint"><Clock /></span><p><strong>Study windows</strong><small>These guide planning without locking every day into a rigid routine.</small></p><div className="inline-fields"><label>Main starts<input type="time" value={planning.mainStart} onChange={(event) => setPlanning({ ...planning, mainStart: event.target.value })} /></label><label>Main ends<input type="time" value={planning.mainEnd} onChange={(event) => setPlanning({ ...planning, mainEnd: event.target.value })} /></label><label>Maths starts<input type="time" value={planning.mathStart} onChange={(event) => setPlanning({ ...planning, mathStart: event.target.value })} /></label><label>Maths ends<input type="time" value={planning.mathEnd} onChange={(event) => setPlanning({ ...planning, mathEnd: event.target.value })} /></label></div></article>
    <article className="settings-editor"><span className="yellow"><Brain /></span><p><strong>Recommendation control</strong><small>Weakness-first rules stay explainable; manual pins still override them.</small></p><div className="inline-fields"><label>Daily target<input type="number" min="60" max="600" value={planning.dailyTarget} onChange={(event) => setPlanning({ ...planning, dailyTarget: Number(event.target.value) })} /><em>min</em></label><label>Maths<input type="number" min="1" max="7" value={planning.mathDaysPerWeek} onChange={(event) => setPlanning({ ...planning, mathDaysPerWeek: Number(event.target.value) })} /><em>days/week</em></label><label>Agriculture<input type="number" min="1" max="7" value={planning.agricultureDaysPerWeek} onChange={(event) => setPlanning({ ...planning, agricultureDaysPerWeek: Number(event.target.value) })} /><em>days/week</em></label></div></article>
    <article><span className="pink"><CloudCheck /></span><p><strong>Offline journal queue</strong><small>{pending} pending change{pending === 1 ? "" : "s"}. Repeated edits are merged before upload.</small></p><button onClick={syncNow}>Retry now</button></article>
    <article><span className="blue"><Warning /></span><p><strong>Study reminders</strong><small>{planning.remindersEnabled ? "Browser permission granted." : "Optional browser and install reminders."}</small></p><button onClick={enableReminders}>{planning.remindersEnabled ? "Enabled" : "Enable"}</button></article>
    {message && <p className="settings-message">{message}</p>}
  </section></main>;
}

function ManualTaskModal({ close, save, defaultDate, preferences }: { close: () => void; save: (task: StudyTask) => void; defaultDate?: string; preferences: ChapterPreference[] }) {
  const selectable = seedChapters.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded);
  const selectableSubjects = subjects.filter((subject) => selectable.some((chapter) => chapter.subjectId === subject.id));
  const initialSubject = selectable.some((chapter) => chapter.subjectId === "mathematics") ? "mathematics" : selectable[0]?.subjectId ?? "mathematics";
  const [subjectId, setSubjectId] = useState(initialSubject);
  const available = selectable.filter((chapter) => chapter.subjectId === subjectId);
  const [chapterId, setChapterId] = useState(available[0]?.id ?? selectable[0]?.id ?? seedChapters[0].id);
  const [time, setTime] = useState("3:00 PM");
  const [duration, setDuration] = useState(45);
  const [date, setDate] = useState(defaultDate ?? "");
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-task-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); const chapter = byChapter(chapterId); const task: StudyTask = { id: crypto.randomUUID(), subjectId, chapterId, title: chapter.title, plannedTime: time, duration, origin: "manual", pinned: true, status: "planned", currentStep: 0, reason: "Manual priority · pinned first", priorityScore: 100, focusedSeconds: 0 }; save(date ? scheduleOn(task, date) : task); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>MANUAL CONTROL</small><h2 id="manual-task-title">Add a study task</h2><label>Subject<select autoFocus value={subjectId} onChange={(event) => { const nextSubject = event.target.value; setSubjectId(nextSubject); setChapterId(selectable.find((chapter) => chapter.subjectId === nextSubject)!.id); }}>{selectableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>{available.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><div className="form-row"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Planned time<input value={time} onChange={(event) => setTime(event.target.value)} /></label><label>Minutes<input type="number" min="10" max="240" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div><button className="solid-cta"><Plus />Add and pin first</button></form></div>;
}

function JournalModal({ task, close, save }: { task: StudyTask; close: () => void; save: (entry: JournalEntry) => void }) {
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
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="journal-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form className="journal-form" onSubmit={(event) => { event.preventDefault(); save({ id: crypto.randomUUID(), taskId: task.id, subjectId: task.subjectId, chapterId: task.chapterId, minutes, attempted, correct, confidenceBefore: before, confidenceAfter: after, learningGoal: goal, resources: resources.split(",").map((item) => item.trim()).filter(Boolean), mistakesText: mistakesText || undefined, writtenScore: writtenScore ? Number(writtenScore) : undefined, reflection: reflection || "Completed the workflow and found the next gap.", nextAction, createdAt: new Date().toISOString() }); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>COMPLETE THE LOOP</small><h2 id="journal-title">Session journal</h2><p>{bySubject(task.subjectId).shortName} · {byChapter(task.chapterId).title}</p><label>Learning goal<input autoFocus value={goal} onChange={(event) => setGoal(event.target.value)} required /></label><label>Resources used<input value={resources} onChange={(event) => setResources(event.target.value)} placeholder="NotebookLM, guidebook, ChatGPT" /></label><div className="form-row"><label>Focused minutes<input type="number" min="1" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label><label>Attempted<input type="number" min="0" value={attempted} onChange={(event) => setAttempted(Number(event.target.value))} /></label><label>Correct<input type="number" min="0" max={attempted} value={correct} onChange={(event) => setCorrect(Number(event.target.value))} /></label></div><div className="form-row"><label>Confidence before<input type="number" min="1" max="5" value={before} onChange={(event) => setBefore(Number(event.target.value))} /></label><label>Confidence after<input type="number" min="1" max="5" value={after} onChange={(event) => setAfter(Number(event.target.value))} /></label><label>Written/mock score<input type="number" min="0" value={writtenScore} onChange={(event) => setWrittenScore(event.target.value)} placeholder="Optional" /></label></div><label>Mistakes or difficult concepts<textarea value={mistakesText} onChange={(event) => setMistakesText(event.target.value)} placeholder="For Maths, this enters the reattempt queue." /></label><label>Reflection<textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What became clear? What remains difficult?" /></label><label>Next action<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label><button className="solid-cta"><CheckCircle weight="fill" />Save and update recommendations</button></form></div>;
}

function MockResultModal({ close, save }: { close: () => void; save: (result: MockResult) => void }) {
  const [subjectId, setSubjectId] = useState("mathematics");
  const [paperType, setPaperType] = useState("Full paper");
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(100);
  const [duration, setDuration] = useState(180);
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mock-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); save({ id: crypto.randomUUID(), subjectId, paperType, score, total, durationMinutes: duration, takenAt: new Date().toISOString() }); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>EXAM EVIDENCE</small><h2 id="mock-title">Record a mock result</h2><label>Subject<select autoFocus value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTotal(officialExamTotals[event.target.value] ?? 100); }}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Paper or section<input value={paperType} onChange={(event) => setPaperType(event.target.value)} /></label><div className="form-row"><label>Score<input type="number" min="0" max={total} value={score} onChange={(event) => setScore(Number(event.target.value))} /></label><label>Out of<input type="number" min="1" value={total} onChange={(event) => setTotal(Number(event.target.value))} /></label><label>Minutes<input type="number" min="1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div><button className="solid-cta"><Exam />Save mock evidence</button></form></div>;
}

export default function CommandCenter() {
  const [active, setActive] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  const [tasks, setTasks] = useStored<StudyTask[]>("ssc-tasks-v3", seededTasks);
  const [chapterList, setChapterList] = useStored<Chapter[]>("ssc-chapters", seedChapters);
  const [entries, setEntries] = useStored<JournalEntry[]>("ssc-journal", []);
  const [mistakes, setMistakes] = useStored<Mistake[]>("ssc-mistakes", seededMistakes);
  const [mocks, setMocks] = useStored<MockResult[]>("ssc-mocks", []);
  const [planning, setPlanning] = useStored<PlanningSettings>("ssc-planning", defaultPlanning);
  const [preferences, setPreferences] = useStored<ChapterPreference[]>("ssc-chapter-preferences", []);
  const [journalTask, setJournalTask] = useState<StudyTask | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState<string | undefined>();
  const [mockOpen, setMockOpen] = useState(false);

  useEffect(() => installOnlineSync(), []);
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      await flushCloudSync();
      const response = await fetch("/api/sync/bootstrap").catch(() => null);
      const payload = response?.ok ? await response.json().catch(() => null) as { mode?: string; data?: Record<string, Record<string, unknown>[]> } | null : null;
      if (cancelled || payload?.mode !== "cloud" || !payload.data) return;
      const data = payload.data;
      if (data.study_tasks?.length) setTasks(data.study_tasks.map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), title: String(row.title), plannedTime: row.planned_start ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(new Date(String(row.planned_start))) : "Unscheduled", plannedStart: row.planned_start ? String(row.planned_start) : undefined, plannedEnd: row.planned_end ? String(row.planned_end) : undefined, duration: Number(row.duration_minutes), origin: row.origin as StudyTask["origin"], pinned: Boolean(row.pinned), status: row.status as StudyTask["status"], currentStep: Number(row.current_step), reason: String(row.priority_explanation ?? "Cloud task"), priorityScore: Number(row.priority_score), focusedSeconds: Number(row.focused_seconds ?? 0) })));
      if (data.chapter_preferences?.length) setPreferences(data.chapter_preferences.map((row) => ({ chapterId: String(row.chapter_id), includedForSsc: Boolean(row.included_for_ssc), targetMonth: row.target_month ? String(row.target_month) : undefined, excluded: Boolean(row.excluded), exclusionReason: row.exclusion_reason ? String(row.exclusion_reason) : undefined, priority: Number(row.priority) as ChapterPreference["priority"] })));
      if (data.chapter_progress?.length) {
        const progress = new Map(data.chapter_progress.map((row) => [String(row.chapter_id), row]));
        setChapterList(seedChapters.map((chapter) => { const row = progress.get(chapter.id); return row ? { ...chapter, status: row.status as Chapter["status"], confidence: Number(row.confidence) as Chapter["confidence"], lastStudied: row.last_studied ? String(row.last_studied) : undefined, nextReview: row.next_review ? String(row.next_review) : undefined, questionsAttempted: Number(row.questions_attempted), questionsCorrect: Number(row.questions_correct) } : chapter; }));
      }
      if (data.journal_entries?.length) setEntries(data.journal_entries.map((row) => ({ id: String(row.id), taskId: String(row.task_id ?? ""), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), minutes: Number(row.minutes), attempted: Number(row.attempted), correct: Number(row.correct), confidenceBefore: Number(row.confidence_before), confidenceAfter: Number(row.confidence_after), learningGoal: String(row.learning_goal ?? ""), resources: Array.isArray(row.resources) ? row.resources.map(String) : [], mistakesText: row.mistakes_text ? String(row.mistakes_text) : undefined, writtenScore: row.written_score == null ? undefined : Number(row.written_score), reflection: String(row.reflection ?? ""), nextAction: String(row.next_action ?? ""), createdAt: String(row.created_at) })));
      if (data.mistakes?.length) setMistakes(data.mistakes.map((row) => ({ id: String(row.id), chapterId: String(row.chapter_id), prompt: String(row.prompt), errorType: String(row.error_type), reattemptDate: String(row.reattempt_date ?? ""), resolved: Boolean(row.resolved) })));
      if (data.mock_results?.length) setMocks(data.mock_results.map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), paperType: String(row.paper_type ?? "Full paper"), score: Number(row.score), total: Number(row.total), durationMinutes: row.duration_minutes == null ? undefined : Number(row.duration_minutes), takenAt: String(row.taken_at) })));
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, [setChapterList, setEntries, setMistakes, setMocks, setPreferences, setTasks]);

  const updateTask = (updated: StudyTask) => {
    const next = tasks.map((task) => task.id === updated.id ? updated : task);
    if (updated.pinned) next.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.priorityScore - a.priorityScore);
    setTasks(next);
    void queueCloudSync("study_tasks", [taskRow(updated)]);
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
    void queueCloudSync("study_tasks", [taskRow(task)]);
    setManualOpen(false);
    setManualDate(undefined);
    setActive("Today");
  };

  const openManual = (date?: string) => { setManualDate(date); setManualOpen(true); };

  const updatePreference = (updated: ChapterPreference) => {
    setPreferences([...preferences.filter((item) => item.chapterId !== updated.chapterId), updated]);
    void queueCloudSync("chapter_preferences", [preferenceRow(updated)]);
    if (updated.excluded) {
      const affected = tasks.filter((task) => task.chapterId === updated.chapterId && task.status !== "completed" && task.status !== "skipped").map((task) => ({ ...task, status: "skipped" as const, plannedStart: undefined, plannedEnd: undefined }));
      if (affected.length) {
        const byId = new Map(affected.map((task) => [task.id, task]));
        setTasks(tasks.map((task) => byId.get(task.id) ?? task));
        void queueCloudSync("study_tasks", affected.map(taskRow));
      }
    }
  };

  const buildGoalQueue = (selected: Chapter[], label: string) => {
    const openChapterIds = new Set(tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").map((task) => task.chapterId));
    const candidates = selected
      .filter((chapter) => chapter.status !== "exam-ready" && !openChapterIds.has(chapter.id) && !preferenceFor(chapter.id, preferences).excluded)
      .sort((a, b) => preferenceFor(b.id, preferences).priority - preferenceFor(a.id, preferences).priority || a.confidence - b.confidence)
      .slice(0, 5);
    const generated = candidates.map((chapter) => {
      const base = recommendTasks(subjects, [chapter], { mistakes, mocks })[0];
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
    void queueCloudSync("study_tasks", generated.map(taskRow));
    setActive("Calendar");
  };

  const save = (entry: JournalEntry) => {
    const accuracy = entry.attempted ? entry.correct / entry.attempted : 0;
    const status: Chapter["status"] = entry.confidenceAfter >= 4 && accuracy >= .8 ? "exam-ready" : accuracy < .6 ? "needs-revision" : "practising";
    const updatedChapter = { ...byChapter(entry.chapterId, chapterList), status, confidence: Math.max(1, Math.min(5, entry.confidenceAfter)) as Chapter["confidence"], questionsAttempted: byChapter(entry.chapterId, chapterList).questionsAttempted + entry.attempted, questionsCorrect: byChapter(entry.chapterId, chapterList).questionsCorrect + entry.correct, lastStudied: entry.createdAt, nextReview: new Date(Date.now() + (status === "exam-ready" ? 7 : 3) * 86400000).toISOString() };
    const updatedTasks = tasks.map((task) => task.id === entry.taskId ? { ...task, status: "completed" as const } : task);
    const updatedChapters = chapterList.map((chapter) => chapter.id === entry.chapterId ? updatedChapter : chapter);
    const nextMistakes = entry.subjectId === "mathematics" && entry.mistakesText ? [{ id: crypto.randomUUID(), chapterId: entry.chapterId, prompt: entry.mistakesText, errorType: "Session mistake", reattemptDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), resolved: false }, ...mistakes] : mistakes;
    const allowedChapters = updatedChapters.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded);
    const recommended = recommendTasks(subjects, allowedChapters, { mistakes: nextMistakes, mocks }).find((candidate) => !updatedTasks.some((task) => task.status !== "completed" && task.chapterId === candidate.chapterId));
    if (recommended) updatedTasks.push({ ...recommended, plannedTime: "Tomorrow", deferredUntil: new Date(Date.now() + 86400000).toISOString() });
    setEntries([entry, ...entries]);
    setTasks(updatedTasks);
    setChapterList(updatedChapters);
    void queueCloudSync("journal_entries", [journalRow(entry)]);
    void queueCloudSync("chapter_progress", [chapterRow(updatedChapter)]);
    void queueCloudSync("study_tasks", updatedTasks.filter((task) => task.id === entry.taskId || task.id === recommended?.id).map(taskRow));
    if (nextMistakes !== mistakes) {
      const mistake = nextMistakes[0];
      setMistakes(nextMistakes);
      void queueCloudSync("mistakes", [{ id: mistake.id, subject_id: "mathematics", chapter_id: mistake.chapterId, prompt: mistake.prompt, error_type: mistake.errorType, reattempt_date: mistake.reattemptDate, resolved: false }]);
    }
    setJournalTask(null);
    setActive("Dashboard");
  };

  const saveMock = (result: MockResult) => {
    setMocks([result, ...mocks]);
    void queueCloudSync("mock_results", [{ id: result.id, subject_id: result.subjectId, paper_type: result.paperType, score: result.score, total: result.total, duration_minutes: result.durationMinutes ?? null, taken_at: result.takenAt }]);
    setMockOpen(false);
  };

  const resolveMistake = (mistake: Mistake) => {
    const updated = { ...mistake, resolved: !mistake.resolved };
    setMistakes(mistakes.map((item) => item.id === mistake.id ? updated : item));
    void queueCloudSync("mistakes", [{ id: updated.id, subject_id: "mathematics", chapter_id: updated.chapterId, prompt: updated.prompt, error_type: updated.errorType, reattempt_date: updated.reattemptDate, resolved: updated.resolved, resolved_at: updated.resolved ? new Date().toISOString() : null }]);
  };

  const firstOpenTask = () => setJournalTask(tasks.find((task) => task.status !== "completed" && !preferenceFor(task.chapterId, preferences).excluded && isTaskAvailable(task)) ?? null);
  const content = (() => {
    switch (active) {
      case "Dashboard": return <Dashboard tasks={tasks} chapters={chapterList} preferences={preferences} mistakes={mistakes} entries={entries} go={setActive} />;
      case "Today": return <Today tasks={tasks} preferences={preferences} update={updateTask} remove={removeTaskFromToday} journal={setJournalTask} add={() => openManual()} />;
      case "Syllabus": return <Syllabus list={chapterList} setList={setChapterList} preferences={preferences} updatePreference={updatePreference} goGoals={() => setActive("Goals")} />;
      case "Goals": return <Goals list={chapterList} preferences={preferences} updatePreference={updatePreference} buildQueue={buildGoalQueue} />;
      case "Calendar": return <StudyCalendar tasks={tasks} preferences={preferences} update={updateTask} add={openManual} openTask={() => setActive("Today")} />;
      case "Journal": return <Journal entries={entries} add={firstOpenTask} />;
      case "Progress": return <Progress entries={entries} list={chapterList} mocks={mocks} addMock={() => setMockOpen(true)} />;
      case "Maths Lab": return <MathsLab mistakes={mistakes} resolve={resolveMistake} />;
      case "Exam Plan": return <ExamPlan />;
      default: return <Settings planning={planning} setPlanning={setPlanning} />;
    }
  })();

  return <div className="app-shell">
    <button className="skip-link" onClick={() => document.querySelector("main")?.focus()}>Skip to main content</button>
    <Sidebar active={active} setActive={setActive} open={menu} close={() => setMenu(false)} />
    {menu && <button className="mobile-scrim" onClick={() => setMenu(false)} aria-label="Close navigation" />}
    <div className="workspace"><Topbar active={active} open={() => setMenu(true)} />{content}</div>
    <nav className="bottom-nav">{[["Dashboard", House], ["Today", CalendarBlank], ["Goals", Target], ["Calendar", CalendarPlus], ["Settings", SlidersHorizontal]].map(([label, Icon]) => <button key={String(label)} aria-label={String(label)} className={active === label ? "active" : ""} onClick={() => setActive(String(label))}><Icon size={22} weight={active === label ? "fill" : "regular"} /></button>)}</nav>
    {manualOpen && <ManualTaskModal close={() => { setManualOpen(false); setManualDate(undefined); }} save={addTask} defaultDate={manualDate} preferences={preferences} />}
    {journalTask && <JournalModal task={journalTask} close={() => setJournalTask(null)} save={save} />}
    {mockOpen && <MockResultModal close={() => setMockOpen(false)} save={saveMock} />}
    <p className="sr-only" aria-live="polite">{manualOpen ? "Add task dialog opened" : journalTask ? "Session journal opened" : mockOpen ? "Mock result dialog opened" : ""}</p>
  </div>;
}
