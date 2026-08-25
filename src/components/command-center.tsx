"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowCounterClockwise, ArrowRight, BookOpen, Books, Brain, CalendarBlank, CalendarPlus, CaretDown, CaretLeft, CaretRight, CaretUp,
  ChartBar, Check, CheckCircle, Clock, CloudCheck, Exam, Headphones, House,
  EyeSlash, ListChecks, MagnifyingGlass, NotePencil, Pause, Play, Plus, PushPin, Rows,
  SignOut, SlidersHorizontal, Sparkle, Target, Timer, Warning, X,
} from "@phosphor-icons/react";
import {
  chapters, marksDistributions, subjects, workflowSteps, replaceAcademicData, orderChapters, SSC_2027_START,
} from "@/lib/academic-data";
import { queueCloudSync } from "@/lib/offline-sync";
import { Button } from "@/components/ui/button";
import { recommendTasks, rescoreStudyTasks } from "@/lib/recommendations";
import { buildAdaptivePlan, revisionDelayDays, subjectProgressMap } from "@/lib/adaptive-planner";
import { defaultWorkflowPresets, isMathematicalSubject, workflowForTask, workflowSubjectType, type CustomStudyWorkflow, type StudyPhase, recommendedWorkflow, studyPhases } from "@/lib/study-workflows";
import { StudyAnalytics, SyllabusEvidenceMap, ExamModeFocus, ResourceLibrary, summarizeStudyEvidence } from "@/components/study-features";
import { AuthScreen } from "@/components/auth-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ExamCountdownCenter } from "@/components/exam-countdown";
import { SupportPage } from "@/components/support-page";
import { QuickStart, type QuickStartStatus } from "@/components/quick-start";
import { recommendedExamPlan, phaseDateLabel } from "@/lib/exam-plan";
import { capacityDayLabel, dailyCapacityMinutes, effectiveCapacityMinutes, isCurrentDailyPlan } from "@/lib/daily-capacity";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { POLICY_CONSENT_STATUS } from "@/lib/policy-config";
import type { AdaptivePlanSummary, Chapter, ChapterPreference, CuratedTextbook, ExamEvent, ExamPlanPhase, ExamSession, JournalEntry, LearningMethod, LearningPreferences, MarksDistribution, Mistake, MockResult, PlanningSettings, RecommendationFeedback, StudyResource, StudySession, StudyTask, Subject, SubjectAssessment, StrengthLevel, UserProfile, WorkflowPreset, ChapterDifficulty } from "@/lib/types";

const SSC_EXAM_YEAR = 2027;

const nav = [
  ["Home", House], ["Syllabus", Books],
  ["Goals", Target], ["Calendar", CalendarPlus], ["Journal", NotePencil], ["Progress", ChartBar],
  ["Exam Mode", Exam], ["Resources", BookOpen], ["Countdown", Timer], ["Exam Plan", Exam], ["Support", Headphones], ["Settings", SlidersHorizontal],
] as const;

const sectionRoutes: Record<string, string> = {
  Home: "/home", Syllabus: "/syllabus", Goals: "/goals", Calendar: "/calendar", Journal: "/journal", Progress: "/progress",
"Exam Mode": "/exam-mode", Resources: "/resources", Countdown: "/countdown", "Exam Plan": "/exam-plan", Support: "/support", Settings: "/settings",
};
const routeSections: Record<string, string> = Object.fromEntries(Object.entries(sectionRoutes).map(([label, path]) => [path.slice(1), label]));
const mobilePrimaryNav = [["Home", House], ["Syllabus", Books], ["Goals", Target], ["Calendar", CalendarPlus]] as const;

const bySubject = (id: string) => subjects.find((subject) => subject.id === id)!;
const strengthLevels: StrengthLevel[] = ["strongest", "very-strong", "moderate", "toughest"];
const strengthLabels: Record<StrengthLevel, string> = { strongest: "Strongest", "very-strong": "Very Strong", moderate: "Moderate", toughest: "Toughest" };
const subjectStrengthsFromRow = (value: unknown): Record<string, StrengthLevel> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([subjectId, strength]) => subjectId && typeof strength === "string" && strengthLevels.includes(strength as StrengthLevel)).map(([subjectId, strength]) => [subjectId, strength as StrengthLevel]));
};
const byChapter = (id: string, list = chapters) => list.find((chapter) => chapter.id === id)!;
const taskById = (tasks: StudyTask[], id: string) => tasks.find((task) => task.id === id);
const subjectAccent: Record<string, Subject["accent"]> = { "bangla-1": "pink", "bangla-2": "yellow", "english-1": "blue", "english-2": "blue", mathematics: "lilac", physics: "lilac", chemistry: "mint", biology: "mint", bgs: "pink", science: "mint", islam: "yellow", hinduism: "pink", ict: "blue", business: "pink", finance: "mint", accounting: "yellow", geography: "mint", economics: "yellow", history: "pink", civics: "blue", "higher-mathematics": "lilac", agriculture: "mint", "home-science": "pink" };
const officialTotalFor = (subjectId: string) => marksDistributions.filter((mark) => mark.subjectId === subjectId).reduce((sum, mark) => sum + mark.marks, 0);

type BootstrapRow = Record<string, unknown>;
const chapterDifficulty = (value: unknown): ChapterDifficulty => Math.max(1, Math.min(5, Number(value ?? 3))) as ChapterDifficulty;
const numericValue = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function learningPreferencesFromRow(row: BootstrapRow, fallback: LearningPreferences): LearningPreferences {
  return {
    userId: String(row.user_id ?? fallback.userId),
    preferredMethods: Array.isArray(row.preferred_methods) ? row.preferred_methods.map(String) as LearningPreferences["preferredMethods"] : fallback.preferredMethods,
    preferredResourceKinds: Array.isArray(row.preferred_resource_kinds) ? row.preferred_resource_kinds.map(String) as LearningPreferences["preferredResourceKinds"] : fallback.preferredResourceKinds,
    sessionLengthMinutes: numericValue(row.session_length_minutes, fallback.sessionLengthMinutes),
    weekdayMinutes: numericValue(row.weekday_minutes, fallback.weekdayMinutes),
    weekendMinutes: numericValue(row.weekend_minutes, fallback.weekendMinutes),
    targetGrade: String(row.target_grade ?? fallback.targetGrade),
    guidanceMode: String(row.guidance_mode ?? fallback.guidanceMode) as LearningPreferences["guidanceMode"],
    planStrictness: String(row.plan_strictness ?? fallback.planStrictness) as LearningPreferences["planStrictness"],
    instructionRatio: numericValue(row.instruction_ratio, fallback.instructionRatio),
    practiceRatio: numericValue(row.practice_ratio, fallback.practiceRatio),
    reviewRatio: numericValue(row.review_ratio, fallback.reviewRatio),
    createdAt: String(row.created_at ?? fallback.createdAt),
    updatedAt: String(row.updated_at ?? fallback.updatedAt),
  };
}

function userProfileFromRow(row: BootstrapRow): UserProfile {
  return {
    userId: String(row.user_id),
    displayName: row.display_name ? String(row.display_name) : undefined,
    board: String(row.board),
    examYear: SSC_EXAM_YEAR,
    selectedSubjects: Array.isArray(row.selected_subjects) ? row.selected_subjects.map(String) : [],
    subjectStrengths: subjectStrengthsFromRow(row.subject_strengths),
    mostDifficultSubjectId: row.most_difficult_subject_id ? String(row.most_difficult_subject_id) : undefined,
    studyGroup: row.study_group as UserProfile["studyGroup"],
    religionSubject: row.religion_subject_id as UserProfile["religionSubject"],
    fourthSubject: row.fourth_subject_id as UserProfile["fourthSubject"],
    academicYear: numericValue(row.academic_year, 2026),
    bookLanguage: "bn",
    academicProfileCompleted: Boolean(row.academic_profile_completed),
    onboardingStep: numericValue(row.onboarding_step, 0),
    onboardingCompleted: Boolean(row.onboarding_completed),
    quickStartStatus: row.quick_start_status === "dismissed" || row.quick_start_status === "completed" ? row.quick_start_status : "active",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function plannedTimeLabel(value: unknown) {
  if (!value) return "Unscheduled";
  const date = new Date(String(value));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  if (hour === 0 && minute === 0) return "Today";
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(date);
}

const studyTaskFromRow = (row: BootstrapRow): StudyTask => ({ id: String(row.id), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), title: String(row.title), plannedTime: plannedTimeLabel(row.planned_start), plannedStart: row.planned_start ? String(row.planned_start) : undefined, plannedEnd: row.planned_end ? String(row.planned_end) : undefined, deferredUntil: row.deferred_until ? String(row.deferred_until) : undefined, duration: Number(row.duration_minutes), origin: row.origin as StudyTask["origin"], pinned: Boolean(row.pinned), status: row.status as StudyTask["status"], currentStep: Number(row.current_step), reason: String(row.priority_explanation ?? "Database task"), priorityScore: Number(row.priority_score), focusedSeconds: Number(row.focused_seconds ?? 0), studyMethod: row.study_method ? String(row.study_method) as StudyTask["studyMethod"] : undefined, workflowPhase: row.workflow_phase ? String(row.workflow_phase) as StudyTask["workflowPhase"] : undefined, workflowSteps: Array.isArray(row.workflow_steps) ? row.workflow_steps.map(String).filter(Boolean) : undefined, workflowStage: row.workflow_stage == null ? undefined : Number(row.workflow_stage), workflowStageCount: row.workflow_stage_count == null ? undefined : Number(row.workflow_stage_count), workflowStageLabel: row.workflow_stage_label ? String(row.workflow_stage_label) : undefined, workflowGroupId: row.workflow_group_id ? String(row.workflow_group_id) : undefined, recommendationFactors: row.recommendation_factors && typeof row.recommendation_factors === "object" ? row.recommendation_factors as Record<string, number> : undefined });

const methodLabel = (method?: LearningMethod) => method ? method.replace("question-bank", "question bank").replace("online-class", "online class").replace("group-study", "group study") : "your preferred method";

const currentMonthKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit" }).format(new Date()) + "-01";
const preferenceFor = (chapterId: string, list: ChapterPreference[]) => list.find((item) => item.chapterId === chapterId) ?? { chapterId, includedForSsc: false, excluded: false, priority: 3 as const };
const monthLabel = (month: string) => new Date(`${month}T00:00:00+06:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
const plannedDate = (task: StudyTask) => task.plannedStart ? dhakaDateKey(new Date(task.plannedStart)) : undefined;
const displayTime = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return "3:00 PM";
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    hour = hour % 12 + (meridiem === "PM" ? 12 : 0);
  }
  if (hour > 23 || Number(minute) > 59) return "3:00 PM";
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
};

const scheduleOn = (task: StudyTask, date: string, time = task.plannedTime) => {
  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  let hour = 15;
  let minute = "00";
  if (match) {
    hour = Number(match[1]);
    minute = match[2];
    const meridiem = match[3]?.toUpperCase();
    if (meridiem) hour = hour % 12 + (meridiem === "PM" ? 12 : 0);
    if (hour > 23 || Number(minute) > 59) { hour = 15; minute = "00"; }
  }
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:${minute}:00+06:00`);
  return { ...task, plannedTime: displayTime(`${String(hour).padStart(2, "0")}:${minute}`), plannedStart: start.toISOString(), plannedEnd: new Date(start.getTime() + task.duration * 60000).toISOString() };
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
  if (task.deferredUntil && new Date(task.deferredUntil).getTime() > Date.now()) return false;
  const date = plannedDate(task);
  return !date || date <= dhakaDateKey();
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
    workflow_phase: task.workflowPhase ?? null,
    priority_score: task.priorityScore, priority_explanation: task.reason, status: task.status,
    current_step: task.currentStep, focused_seconds: task.focusedSeconds ?? 0, planned_start: plannedStart, planned_end: plannedEnd,
    deferred_until: task.deferredUntil ?? null,
    study_method: task.studyMethod ?? null,
    workflow_steps: task.workflowSteps?.length ? task.workflowSteps : null,
    workflow_stage: task.workflowStage ?? null,
    workflow_stage_count: task.workflowStageCount ?? null,
    workflow_stage_label: task.workflowStageLabel ?? null,
    workflow_group_id: task.workflowGroupId ?? null,
    recommendation_factors: task.recommendationFactors ?? {},
  };
}

function chapterRow(chapter: Chapter) {
  return {
    id: `progress-${chapter.id}`, chapter_id: chapter.id, status: chapter.status,
    confidence: chapter.confidence, difficulty: chapter.difficulty, last_studied: chapter.lastStudied ?? null,
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
  return { id: session.id, task_id: session.taskId, subject_id: session.subjectId, chapter_id: session.chapterId, mode: session.mode, started_at: session.startedAt, ended_at: session.endedAt ?? null, last_resumed_at: session.lastResumedAt ?? null, focused_seconds: session.focusedSeconds, pause_seconds: session.pauseSeconds, timer_state: session.timerState ?? (session.completed ? "completed" : "paused"), completed: session.completed, questions_attempted: session.questionsAttempted ?? null, questions_correct: session.questionsCorrect ?? null };
}

function examSessionRow(session: ExamSession) {
  return { id: session.id, subject_id: session.subjectId, chapter_id: session.chapterId, status: session.status, target_minutes: session.targetMinutes, elapsed_seconds: session.elapsedSeconds, last_resumed_at: session.lastResumedAt ?? null, started_at: session.startedAt ?? null, ended_at: session.endedAt ?? null, mcq_attempted: session.mcqAttempted, mcq_correct: session.mcqCorrect, cq_attempted: session.cqAttempted, cq_correct: session.cqCorrect, sq_attempted: session.sqAttempted, sq_correct: session.sqCorrect, created_at: session.createdAt, updated_at: session.updatedAt };
}
function resourceRow(resource: StudyResource) {
  return { id: resource.id, subject_id: resource.subjectId, chapter_id: resource.chapterId, title: resource.title, url: resource.url, kind: resource.kind, source: resource.source, storage_path: resource.storagePath ?? null, file_name: resource.fileName ?? null, mime_type: resource.mimeType ?? null, file_size: resource.fileSize ?? null, note: resource.note ?? null, archived: resource.archived ?? false, created_at: resource.createdAt, updated_at: resource.updatedAt };
}

function examEventRow(event: ExamEvent) {
  return { id: event.id, name: event.name, starts_on: event.start, ends_on: event.end, kind: event.kind, scope: event.scope, note: event.note ?? null, locked: event.locked ?? false, archived: event.archived ?? false };
}

function planningRow(settings: PlanningSettings) {
  return { reminders_enabled: settings.remindersEnabled };
}

function adaptivePlanRow(summary: AdaptivePlanSummary) {
  return { used_minutes: summary.usedMinutes, available_minutes: summary.availableMinutes, deferred_count: summary.deferredCount, generated_revision_count: summary.generatedRevisionCount, rationale: summary.rationale, planned_at: summary.plannedAt };
}

function learningPreferencesRow(value: Partial<LearningPreferences>) {
  return {
    preferred_methods: value.preferredMethods,
    preferred_resource_kinds: value.preferredResourceKinds,
    session_length_minutes: value.sessionLengthMinutes,
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

function workflowPresetRow(value: WorkflowPreset) {
  return { id: value.id, name: value.name, description: value.description, phase: value.phase, subject_type: value.subjectType, steps: value.steps };
}

function examPlanPhaseRow(value: ExamPlanPhase) {
  return { id: value.id, title: value.title, starts_on: value.start, ends_on: value.end, objective: value.objective, phase_order: value.order };
}

function Sidebar({ active, setActive, open, close }: { active: string; setActive: (value: string) => void; open: boolean; close: () => void }) {
  return <aside id="app-navigation" className={`sidebar ${open ? "is-open" : ""}`} aria-label="Primary navigation">
    <button className="close-menu" onClick={close} aria-label="Close navigation"><X /></button>
    <button className="brand" onClick={() => { setActive("Home"); close(); }}>
      <Image src="/chaptr-logo.png" width={42} height={42} alt="" aria-hidden="true" />
      <div><strong>Chaptr</strong><small>Study workspace</small></div>
    </button>
    <nav>{nav.map(([label, Icon]) => <Button key={label} variant={active === label ? "secondary" : "ghost"} size="sm" className={`sidebar-nav-button ${active === label ? "active" : ""}`} aria-current={active === label ? "page" : undefined} onClick={() => { setActive(label); close(); }}><Icon size={21} weight={active === label ? "fill" : "regular"} /><span>{label}</span></Button>)}</nav>
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


function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{children}</div>;
}

function Dashboard({ tasks, chapters, preferences, mistakes, entries, examEvents, learningPreferences, planSummary, go, startStudy, add }: { tasks: StudyTask[]; chapters: Chapter[]; preferences: ChapterPreference[]; mistakes: Mistake[]; entries: JournalEntry[]; examEvents: ExamEvent[]; learningPreferences: LearningPreferences; planSummary: AdaptivePlanSummary | null; go: (value: string) => void; startStudy: (task: StudyTask) => void; add: () => void }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const first = visible[0];
  if (!first) return <section className="dashboard-page home-section"><section className="empty-dashboard-grid"><article className="panel empty-dashboard-card"><div className="empty-illustration"><CalendarBlank /></div><div><small>READY WHEN YOU ARE</small><h2>Start with one clear study action.</h2><p>Your syllabus is loaded. Choose a chapter or add a task to begin today&apos;s work.</p><div className="empty-actions"><Button size="lg" className="solid-cta" onClick={add}><Plus />Add Task</Button><Button size="lg" variant="outline" onClick={() => go("Goals")}>Set chapter goals</Button></div></div></article><aside className="panel setup-checklist"><small>FIRST 3 MOVES</small><h3>A simple way to begin.</h3><ol><li>Choose the chapters you will cover for SSC.</li><li>Add a focused task to today&apos;s timeline.</li><li>Write a short journal entry when you finish.</li></ol></aside></section></section>;
  const subject = bySubject(first.subjectId);
  const chapter = byChapter(first.chapterId);
  const subjectStats = subjects.map((item) => {
    const subjectChapters = chapters.filter((chapterItem) => chapterItem.subjectId === item.id);
    const chapterIds = new Set(subjectChapters.map((chapterItem) => chapterItem.id));
    const openMistakes = mistakes.filter((mistake) => chapterIds.has(mistake.chapterId) && !mistake.resolved).length;
    const readiness = subjectChapters.length ? Math.round(subjectChapters.reduce((sum, chapterItem) => sum + chapterItem.confidence, 0) / (subjectChapters.length * 5) * 100) : 0;
    const evidenceEntries = entries.filter((entry) => entry.subjectId === item.id).length;
    return { subject: item, chapters: subjectChapters, openMistakes, readiness, evidenceEntries };
  }).filter((item) => item.chapters.length > 0);
  const evidenceRows = [...subjectStats].sort((a, b) => a.readiness - b.readiness || b.openMistakes - a.openMistakes).slice(0, 4);
  const repairRows = [...subjectStats].sort((a, b) => b.openMistakes - a.openMistakes || a.readiness - b.readiness).slice(0, 3);
  return <section className="dashboard-page home-section">
    <section className="hero-grid">
      <article className="priority-hero">
        <div className="eyebrow"><Sparkle weight="fill" />BEST NEXT MOVE</div>
        <h2>{subject.shortName}</h2>
        <p>{chapter.number ? `Chapter ${chapter.number} · ` : ""}{chapter.title}</p>
        <div className="chips"><span>{first.reason.split(" · ")[0]}</span><span>{first.priorityScore} priority</span><span>{first.duration} min</span></div>
        <Button size="lg" className="solid-cta" onClick={() => startStudy(first)}><Play weight="fill" />Start study flow</Button>
        <Brain className="hero-art" weight="duotone" />
      </article>
    </section>
    <HomeSummaryCards tasks={tasks} preferences={preferences} entries={entries} examEvents={examEvents} learningPreferences={learningPreferences} planSummary={planSummary} />
    <section className="strategy-ribbon"><button onClick={() => go("Goals")}><Target weight="fill" /><span><small>SSC COVERAGE</small><strong>{preferences.filter((item) => item.includedForSsc && !item.excluded).length} chapters</strong></span><CaretRight /></button><button onClick={() => go("Goals")}><CalendarPlus weight="fill" /><span><small>{monthLabel(currentMonthKey()).toUpperCase()}</small><strong>{preferences.filter((item) => item.targetMonth === currentMonthKey() && !item.excluded).length} chapter goals</strong></span><CaretRight /></button><button onClick={() => go("Syllabus")}><EyeSlash weight="fill" /><span><small>CHAPTER EXCLUSIONS</small><strong>{preferences.filter((item) => item.excluded).length} excluded</strong></span><CaretRight /></button></section>
    <section className="dashboard-grid">
      <article className="panel weekly"><SectionTitle kicker="LIVE EVIDENCE" title="Work that protects your result" /><div className="bars">{evidenceRows.length ? evidenceRows.map(({ subject: evidenceSubject, readiness }) => <div key={evidenceSubject.id}><span>{evidenceSubject.name}</span><i><b className={evidenceSubject.accent} style={{ width: `${readiness}%` }} /></i><strong>{readiness}%</strong></div>) : <div className="empty compact"><p>No subject evidence yet. Complete a chapter or log a study result to build this view.</p></div>}</div></article>
      <article className="panel risks"><SectionTitle kicker="URGENT" title="Repair queue"><Warning weight="fill" /></SectionTitle>{repairRows.length ? repairRows.map(({ subject: repairSubject, readiness, openMistakes, chapters: repairChapters }) => <button key={repairSubject.id} onClick={() => go("Syllabus")}><i className={repairSubject.accent} /><span><strong>{repairSubject.name}</strong><small>{openMistakes ? `${openMistakes} open mistake${openMistakes === 1 ? "" : "s"} need reattempts` : `${readiness}% readiness · ${repairChapters.length} chapters tracked`}</small></span><CaretRight /></button>) : <div className="empty compact"><p>No repair signals yet. Your queue will appear as chapter evidence accumulates.</p></div>}</article>
    </section>
    <section className="panel queue"><SectionTitle kicker="TODAY" title="Recommended queue"><button onClick={() => document.getElementById("daily-loop")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Open full day <ArrowRight /></button></SectionTitle>{visible.slice(0, 4).map((task, index) => <div key={task.id}><span className={`number ${bySubject(task.subjectId).accent}`}>{index + 1}</span><p><strong>{bySubject(task.subjectId).shortName}</strong><small>{task.title}</small></p><time>{task.plannedTime}</time><b>{task.duration}m</b></div>)}</section>
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

function focusElapsedSeconds(session?: StudySession | null, now = Date.now()) {
  if (!session) return 0;
  const liveSeconds = session.timerState === "running" && session.lastResumedAt ? Math.max(0, Math.floor((now - new Date(session.lastResumedAt).getTime()) / 1000)) : 0;
  return session.focusedSeconds + liveSeconds;
}

function FocusTimer({ session, baseSeconds = 0, onStart, onChange, onReset }: { session?: StudySession; baseSeconds?: number; onStart: () => void; onChange: (session: StudySession) => void; onReset: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const running = session?.timerState === "running";
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!running || !session) return;
    const id = window.setInterval(() => {
      const elapsed = focusElapsedSeconds(session);
      onChange({ ...session, focusedSeconds: elapsed, lastResumedAt: new Date().toISOString() });
    }, 10000);
    return () => window.clearInterval(id);
  }, [onChange, running, session]);
  const seconds = session ? focusElapsedSeconds(session, now) : baseSeconds;
  const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="timer-box"><Timer /><strong>{label}</strong><button className="primary" onClick={() => { if (!session || session.timerState !== "running") onStart(); else onChange({ ...session, focusedSeconds: seconds, timerState: "paused", lastResumedAt: undefined }); }}>{running ? <><Pause weight="fill" />Pause</> : <><Play weight="fill" />{session?.timerState === "paused" ? "Resume" : "Focus"}</>}</button><button onClick={onReset}>Reset</button></div>;
}

function AdaptivePlannerControls({ summary, baselineMinutes, run, state, message }: { summary: AdaptivePlanSummary | null; baselineMinutes: number; run: (minutes: number) => void | Promise<void>; state: "idle" | "running" | "success" | "error"; message?: string }) {
  const [minutes, setMinutes] = useState(isCurrentDailyPlan(summary) ? summary!.availableMinutes : baselineMinutes);
  const busy = state === "running";
  const presets = Array.from(new Set([30, 60, 90, baselineMinutes])).sort((a, b) => a - b);
  return <article className="panel adaptive-planner"><div className="adaptive-planner-copy"><small className="eyebrow">TODAY&apos;S CAPACITY</small><h3>Plan around the time you actually have.</h3><p>Your normal {capacityDayLabel().toLowerCase()} is {baselineMinutes} minutes. Change it only when today is different.</p>{summary?.rationale.map((line) => <small className="planner-note" key={line}>{line}</small>)}</div><div className="adaptive-planner-actions"><div className="capacity-presets" role="group" aria-label="Available study time today">{presets.map((value) => <button type="button" key={value} className={minutes === value ? "selected" : ""} aria-pressed={minutes === value} onClick={() => setMinutes(value)}>{value === baselineMinutes ? `Usual · ${value}m` : `${value}m`}</button>)}</div><label>Custom minutes<input type="number" min="15" max="720" step="15" value={minutes} onChange={(event) => setMinutes(Math.max(15, Math.min(720, Number(event.target.value))))} /></label><button type="button" className="accent build-plan-button" onClick={() => void run(minutes)} disabled={busy} aria-busy={busy}><Sparkle weight="fill" />{busy ? "Planning…" : "Build today’s plan"}</button>{summary && <span className="planner-result" role="status">{summary.usedMinutes}/{summary.availableMinutes} min planned · {summary.deferredCount} saved for later</span>}{message && <span className={`planner-feedback ${state}`} role="status">{message}</span>}</div></article>;
}

function DailyTaskCard({ task, subject, index, featured, expanded, toggle, update, remove, journal, feedback, workflows, workflowPresets, preferredMethods, focusSession, startFocus, updateFocus, resetFocus }: { task: StudyTask; subject: Subject; index: number; featured?: boolean; expanded: boolean; toggle: () => void; update: (task: StudyTask) => void; remove: (task: StudyTask) => void; journal: (task: StudyTask) => void; feedback: (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => void; workflows: CustomStudyWorkflow[]; workflowPresets: WorkflowPreset[]; preferredMethods: LearningMethod[]; focusSession?: StudySession; startFocus: () => void; updateFocus: (session: StudySession) => void; resetFocus: () => void }) {
  const workflow = workflowForTask(task, workflows, workflowPresets, preferredMethods);
  const steps = workflow.steps;
  const advance = () => {
    if (task.currentStep + 1 >= steps.length) return journal(task);
    update({ ...task, currentStep: task.currentStep + 1, status: "in-progress" });
  };
  return <article id={`study-task-${task.id}`} className={`daily-task-card ${subject.accent} ${featured ? "featured" : ""} ${expanded ? "open" : ""}`}>
    <div className="daily-task-meta"><span>{featured ? "START HERE" : `OPTION ${index + 1}`}</span><small>{task.plannedTime} · {task.duration} min</small></div>
    <div className="task-card">
      <div className="task-heading"><button className="task-summary" onClick={toggle} aria-expanded={expanded}><span className="subject-token">{subject.shortName.slice(0, 2)}</span><p><small>{subject.shortName}{task.pinned ? " · PINNED" : ""}</small><strong>{task.title}</strong><em>{task.reason}</em></p><CaretDown /></button><button className="remove-today" onClick={() => remove(task)} aria-label={`Remove ${task.title} from today's plan`} title="Remove from today"><X /></button></div>
      {expanded && <div className="steps">
        <div className="recommendation-why"><Sparkle weight="fill" /><span><small>WHY THIS TASK</small><strong>{task.reason}</strong></span></div>
        <p className="method-note"><span>RECOMMENDED {studyPhases.find((phase) => phase.id === workflow.phase)?.label.toUpperCase()}</span><strong>{workflow.preset?.name ?? `${methodLabel(task.studyMethod)} · ${workflowPresets.some((item) => item.phase === workflow.phase && (item.subjectType === workflowSubjectType(task.subjectId) || item.subjectType === "custom")) ? "your preset" : "recommended steps"}`}</strong></p>
        <FocusTimer session={focusSession} baseSeconds={task.focusedSeconds ?? 0} onStart={startFocus} onChange={updateFocus} onReset={resetFocus} />
        <div className="task-actions"><button className={task.pinned ? "pinned" : ""} onClick={() => update({ ...task, pinned: !task.pinned, priorityScore: task.pinned ? task.priorityScore : 100 })}><PushPin weight={task.pinned ? "fill" : "regular"} />{task.pinned ? "Pinned" : "Pin first"}</button><button onClick={() => update({ ...task, status: "planned", plannedTime: "Tomorrow", deferredUntil: new Date(Date.now() + 86400000).toISOString() })}>Move to tomorrow</button></div>
        <div className="recommendation-feedback"><small>Was this a useful next step?</small><button onClick={() => feedback(task, "useful")}>Useful</button><button onClick={() => feedback(task, "too-hard")}>Too hard</button><button onClick={() => feedback(task, "too-easy")}>Too easy</button><button onClick={() => feedback(task, "not-today")}>Not today</button></div>
        {steps.map((name, step) => <StudyStep key={name} name={name} index={step} current={task.currentStep} onAdvance={advance} />)}
        <button className="finish" onClick={() => journal(task)}><NotePencil />Close with journal</button>
      </div>}
    </div>
  </article>;
}

function Today({ tasks, preferences, update, remove, journal, add, focusTaskId, planSummary, baselineMinutes, planToday, plannerState, plannerMessage, feedback, entries, goJournal, workflows, workflowPresets, preferredMethods, sessions, startFocus, updateFocus, resetFocus }: { tasks: StudyTask[]; preferences: ChapterPreference[]; update: (task: StudyTask) => void; remove: (task: StudyTask) => void; journal: (task: StudyTask) => void; add: () => void; focusTaskId?: string | null; planSummary: AdaptivePlanSummary | null; baselineMinutes: number; planToday: (minutes: number) => void | Promise<void>; plannerState: "idle" | "running" | "success" | "error"; plannerMessage?: string; feedback: (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => void; entries: JournalEntry[]; goJournal: () => void; workflows: CustomStudyWorkflow[]; workflowPresets: WorkflowPreset[]; preferredMethods: LearningMethod[]; sessions: StudySession[]; startFocus: (task: StudyTask) => void; updateFocus: (session: StudySession) => void; resetFocus: (task: StudyTask) => void }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const doNow = visible[0];
  const moreTime = visible.slice(1);
  const todayKey = dhakaDateKey();
  const todayEntries = entries.filter((entry) => dhakaDateKey(new Date(entry.createdAt)) === todayKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestEntry = todayEntries[0];
  const [expanded, setExpanded] = useState(focusTaskId ?? doNow?.id ?? "");
  useEffect(() => {
    if (!focusTaskId) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(`study-task-${focusTaskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [focusTaskId]);
  const completedMinutes = todayEntries.reduce((sum, entry) => sum + entry.minutes, 0);
  const plannedMinutes = visible.reduce((sum, task) => sum + task.duration, 0);
  return <section id="daily-loop" className="today-page home-section" tabIndex={-1}>
    <SectionTitle kicker={`YOUR DAILY LOOP · ${dhakaDate()}`} title="What to do next"><button className="add-task" onClick={add}><Plus />Add task</button></SectionTitle>
    <AdaptivePlannerControls summary={planSummary} baselineMinutes={baselineMinutes} run={planToday} state={plannerState} message={plannerMessage} />
    <div className="daily-loop-grid">
      <section className="daily-loop-section do-now-section">
        <div className="daily-loop-heading"><span className="daily-loop-index">1</span><div><small>DO NOW</small><h3>Start with one clear action.</h3><p>The strongest next step is first. You do not need to plan the whole day before beginning.</p></div></div>
        {doNow ? <DailyTaskCard task={doNow} subject={bySubject(doNow.subjectId)} index={0} featured expanded={expanded === doNow.id} toggle={() => setExpanded(expanded === doNow.id ? "" : doNow.id)} update={update} remove={remove} journal={journal} feedback={feedback} workflows={workflows} workflowPresets={workflowPresets} preferredMethods={preferredMethods} focusSession={sessions.find((session) => session.taskId === doNow.id && session.mode === "focus" && session.timerState !== "completed")} startFocus={() => startFocus(doNow)} updateFocus={updateFocus} resetFocus={() => resetFocus(doNow)} /> : <div className="daily-loop-empty"><CheckCircle weight="fill" /><strong>Your open queue is clear.</strong><p>Use the journal to record what you completed, or add one manual task when you are ready.</p><button className="solid-cta" onClick={goJournal}><NotePencil />Close today&apos;s loop</button></div>}
      </section>
      <section className="daily-loop-section more-time-section">
        <div className="daily-loop-heading"><span className="daily-loop-index">2</span><div><small>IF YOU HAVE MORE TIME</small><h3>Keep going without guessing.</h3><p>These are useful follow-ups after Do Now. Stop when your planned time is used.</p></div></div>
        <div className="daily-more-list">{moreTime.length ? moreTime.map((task, index) => <DailyTaskCard key={task.id} task={task} subject={bySubject(task.subjectId)} index={index + 1} expanded={expanded === task.id} toggle={() => setExpanded(expanded === task.id ? "" : task.id)} update={update} remove={remove} journal={journal} feedback={feedback} workflows={workflows} workflowPresets={workflowPresets} preferredMethods={preferredMethods} focusSession={sessions.find((session) => session.taskId === task.id && session.mode === "focus" && session.timerState !== "completed")} startFocus={() => startFocus(task)} updateFocus={updateFocus} resetFocus={() => resetFocus(task)} />) : <div className="daily-loop-empty compact"><Timer /><strong>No extra work is required.</strong><p>Protect your energy and return tomorrow. The planner will refill this section when needed.</p></div>}</div>
      </section>
    </div>
    <section className="daily-loop-section close-loop-section">
      <div className="daily-loop-heading"><span className="daily-loop-index">3</span><div><small>CLOSE THE LOOP</small><h3>Turn the session into better recommendations.</h3><p>Log what you understood, what was difficult, and the next action. This is how SSC learns from your day.</p></div></div>
      {latestEntry ? <article className="close-loop-result"><CheckCircle weight="fill" /><div><strong>{bySubject(latestEntry.subjectId).shortName} evidence saved.</strong><p>{latestEntry.reflection}</p><small>Next: {latestEntry.nextAction}</small></div><button onClick={goJournal}>View journal <ArrowRight /></button></article> : doNow ? <div className="close-loop-prompt"><NotePencil /><div><strong>Nothing logged yet today.</strong><p>After Do Now, record a quick result instead of relying on memory.</p></div><button className="solid-cta" onClick={() => journal(doNow)}>Open close-out <NotePencil /></button></div> : <div className="close-loop-result quiet"><CheckCircle weight="fill" /><div><strong>No close-out is waiting.</strong><p>Start a task when you are ready, then return here to capture the evidence.</p></div></div>}
      <small className="daily-loop-footnote">{todayEntries.length ? `${todayEntries.length} evidence entr${todayEntries.length === 1 ? "y" : "ies"} today · ${completedMinutes} focused minutes logged` : `${plannedMinutes} minutes remain in the visible plan`}</small>
    </section>
  </section>;
}

function HomeSummaryCards({ tasks, preferences, entries, examEvents, learningPreferences, planSummary }: { tasks: StudyTask[]; preferences: ChapterPreference[]; entries: JournalEntry[]; examEvents: ExamEvent[]; learningPreferences: LearningPreferences; planSummary: AdaptivePlanSummary | null }) {
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const visible = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped" && isTaskAvailable(task) && !excluded.has(task.chapterId));
  const todayKey = dhakaDateKey();
  const completedMinutes = entries.filter((entry) => dhakaDateKey(new Date(entry.createdAt)) === todayKey).reduce((sum, entry) => sum + entry.minutes, 0);
  const plannedMinutes = visible.reduce((sum, task) => sum + task.duration, 0);
  const targetMinutes = effectiveCapacityMinutes(learningPreferences, planSummary);
  const progress = Math.min(100, Math.round(completedMinutes / Math.max(targetMinutes, 1) * 100));
  const countdowns = ["test", "ssc"].map((id) => examEvents.find((event) => event.id === id)).filter((event): event is ExamEvent => Boolean(event));
  return <section className="home-summary-cards" aria-label="Exam dates and today target">
    <article className="mini-card home-target-card"><small>TODAY&apos;S CAPACITY</small><h3>{targetMinutes}<em> min</em><b>{progress}%</b></h3><p>{completedMinutes} completed · {plannedMinutes} currently queued</p><div className="meter" role="progressbar" aria-label={`${completedMinutes} of ${targetMinutes} available study minutes completed today`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></article>
    {countdowns.map((event) => <HomeCountdownCard key={event.id} event={event} />)}
  </section>;
}
function HomeCountdownCard({ event }: { event: ExamEvent }) {
  const [now] = useState(() => Date.now());
  const target = new Date(`${event.start}T00:00:00+06:00`).getTime();
  const days = Math.ceil((target - now) / 86400000);
  const label = days > 0 ? `${days} days` : days === 0 ? "Today" : "Started";
  return <article className={`mini-card home-countdown-card ${event.id === "ssc" ? "official" : "test"}`}><small>{event.id === "ssc" ? "SSC EXAM" : "TEST EXAM"}</small><h3>{event.id === "ssc" ? "SSC 2027" : event.name}</h3><strong>{label}</strong><span>Starts {new Date(`${event.start}T00:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })}</span></article>;
}
function Home({ tasks, chapters, preferences, mistakes, entries, examEvents, learningPreferences, update, remove, journal, add, focusTaskId, planSummary, planToday, plannerState, plannerMessage, sessions, startFocus, updateFocus, resetFocus, go, startStudy, feedback, goJournal, workflows, workflowPresets, preferredMethods, quickStartStatus, onQuickStartStatusChange }: { tasks: StudyTask[]; chapters: Chapter[]; preferences: ChapterPreference[]; mistakes: Mistake[]; entries: JournalEntry[]; examEvents: ExamEvent[]; learningPreferences: LearningPreferences; update: (task: StudyTask) => void; remove: (task: StudyTask) => void; journal: (task: StudyTask) => void; add: () => void; focusTaskId?: string | null; planSummary: AdaptivePlanSummary | null; planToday: (minutes: number) => void | Promise<void>; plannerState: "idle" | "running" | "success" | "error"; plannerMessage?: string; sessions: StudySession[]; startFocus: (task: StudyTask) => void; updateFocus: (session: StudySession) => void; resetFocus: (task: StudyTask) => void; go: (value: string) => void; startStudy: (task: StudyTask) => void; feedback: (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => void; goJournal: () => void; workflows: CustomStudyWorkflow[]; workflowPresets: WorkflowPreset[]; preferredMethods: LearningMethod[]; quickStartStatus: QuickStartStatus; onQuickStartStatusChange: (status: QuickStartStatus) => void | Promise<void> }) {
  const hasEvidence = entries.length > 0 || sessions.some((session) => session.completed || (session.focusedSeconds ?? 0) > 0);
  return <main id="main-content" tabIndex={-1} className="page home-page"><Dashboard tasks={tasks} chapters={chapters} preferences={preferences} mistakes={mistakes} entries={entries} examEvents={examEvents} learningPreferences={learningPreferences} planSummary={planSummary} go={go} startStudy={startStudy} add={add} /><QuickStart status={quickStartStatus} tasks={tasks} chapters={chapters} preferences={preferences} hasEvidence={hasEvidence} onGo={go} onAddTask={add} onStartTask={(task) => { startFocus(task); startStudy(task); }} onStatusChange={onQuickStartStatusChange} /><Today tasks={tasks} preferences={preferences} update={update} remove={remove} journal={journal} add={add} focusTaskId={focusTaskId} planSummary={planSummary} baselineMinutes={dailyCapacityMinutes(learningPreferences)} planToday={planToday} plannerState={plannerState} plannerMessage={plannerMessage} feedback={feedback} entries={entries} goJournal={goJournal} workflows={workflows} workflowPresets={workflowPresets} preferredMethods={preferredMethods} sessions={sessions} startFocus={startFocus} updateFocus={updateFocus} resetFocus={resetFocus} /></main>;
}

const difficultyLabels: Record<ChapterDifficulty, string> = { 1: "Easy", 2: "Light", 3: "Moderate", 4: "Hard", 5: "Very hard" };

function DifficultyPicker({ value, onChange }: { value: ChapterDifficulty; onChange: (value: ChapterDifficulty) => void }) {
  return <div className="difficulty-picker" role="group" aria-label="Chapter difficulty"><small>Difficulty</small><span>{([1, 2, 3, 4, 5] as ChapterDifficulty[]).map((level) => <button type="button" key={level} className={level === value ? "active" : ""} onClick={() => onChange(level)} aria-label={`${difficultyLabels[level]} difficulty`} aria-pressed={level === value}>{level}</button>)}</span><em>{difficultyLabels[value]}</em></div>;
}

function PriorCompletionPanel({ list, subjects: availableSubjects, save, close }: { list: Chapter[]; subjects: Subject[]; save: (chapterIds: string[]) => Promise<void>; close: () => void }) {
  const subjectOptions = availableSubjects.filter((subject) => list.some((chapter) => chapter.subjectId === subject.id));
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currentSubject = subjectOptions.find((subject) => subject.id === subjectId) ?? subjectOptions[0];
  const currentChapters = currentSubject ? orderChapters(list.filter((chapter) => chapter.subjectId === currentSubject.id && chapter.status !== "exam-ready")) : [];
  const toggle = (chapterId: string) => setSelectedIds((current) => current.includes(chapterId) ? current.filter((id) => id !== chapterId) : [...current, chapterId]);
  const markAll = () => setSelectedIds((current) => Array.from(new Set([...current, ...currentChapters.map((chapter) => chapter.id)])));
  const saveSelection = async () => {
    if (!selectedIds.length) {
      setMessage("Choose at least one chapter first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await save(selectedIds);
      setMessage(`${selectedIds.length} chapter${selectedIds.length === 1 ? "" : "s"} added to your completed history.`);
      setSelectedIds([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save completed chapters.");
    } finally {
      setBusy(false);
    }
  };
  return <section className="prior-completion-panel" aria-labelledby="prior-completion-title"><div className="prior-completion-heading"><div><small>STARTING POINT</small><h3 id="prior-completion-title">Already finished chapters?</h3><p>Mark work you completed before joining. Those chapters will leave the new-learning queue and remain available for revision.</p></div><button type="button" className="panel-close-button" onClick={close} aria-label="Close prior completion panel"><X /></button></div><div className="prior-completion-subjects" role="tablist" aria-label="Choose a subject">{subjectOptions.map((subject) => <button type="button" role="tab" aria-selected={currentSubject?.id === subject.id} className={currentSubject?.id === subject.id ? "active" : ""} key={subject.id} onClick={() => setSubjectId(subject.id)}><strong>{subject.shortName}</strong><small>{list.filter((chapter) => chapter.subjectId === subject.id && chapter.status === "exam-ready").length} complete</small></button>)}</div>{currentSubject && <div className="prior-completion-list"><div className="prior-completion-list-heading"><strong>{currentSubject.name}</strong><button type="button" onClick={markAll} disabled={!currentChapters.length}>Mark all visible</button></div>{currentChapters.length ? currentChapters.map((chapter) => <button type="button" key={chapter.id} className={selectedIds.includes(chapter.id) ? "selected" : ""} onClick={() => toggle(chapter.id)} aria-pressed={selectedIds.includes(chapter.id)}><span>{selectedIds.includes(chapter.id) ? <CheckCircle weight="fill" /> : <span />}</span><strong>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</strong><small>{selectedIds.includes(chapter.id) ? "Will be marked complete" : chapter.status.replace("-", " ")}</small></button>) : <p className="prior-completion-empty">All chapters in this subject are already marked complete.</p>}</div>}<div className="prior-completion-footer"><span>{selectedIds.length} selected</span><div><button type="button" onClick={close}>Not now</button><button type="button" className="accent" onClick={saveSelection} disabled={busy || !selectedIds.length}>{busy ? "Saving…" : "Save completed history"}</button></div></div>{message && <p className="prior-completion-message" role="status">{message}</p>}</section>;
}

function Syllabus({ list, setList, preferences, updatePreference, completeChapter, uncompleteChapter, persistProgress, saveCompletedChapters, goGoals, sessions, entries, mistakes, resources, subjectStrengths, subjectAssessments, saveSubjectPriority, goResources }: { list: Chapter[]; setList: (value: Chapter[]) => void; preferences: ChapterPreference[]; updatePreference: (value: ChapterPreference) => void; completeChapter: (chapter: Chapter) => void; uncompleteChapter: (chapter: Chapter) => void; persistProgress: (chapter: Chapter) => void; saveCompletedChapters: (chapterIds: string[]) => Promise<void>; goGoals: () => void; sessions: StudySession[]; entries: JournalEntry[]; mistakes: Mistake[]; resources: StudyResource[]; subjectStrengths: Record<string, StrengthLevel>; subjectAssessments: SubjectAssessment[]; saveSubjectPriority: (subjectId: string, priority: SubjectAssessment["priority"]) => Promise<void>; goResources: (chapterId: string) => void }) {
  const [selected, setSelected] = useState("mathematics");
  const [query, setQuery] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const [priorPanelOpen, setPriorPanelOpen] = useState(false);
  const [prioritySaving, setPrioritySaving] = useState<string | null>(null);
  const [priorityError, setPriorityError] = useState("");
  const subject = bySubject(selected);
  const personalStrength = subjectStrengths[subject.id] ?? subject.strength;
  const mine = orderChapters(list.filter((chapter) => chapter.subjectId === selected && chapter.title.toLowerCase().includes(query.toLowerCase()) && (showExcluded || !preferenceFor(chapter.id, preferences).excluded)));
  const marks = marksDistributions.filter((mark) => mark.subjectId === selected);
  const priorityLabels: Record<SubjectAssessment["priority"], string> = { 1: "Low", 2: "Light", 3: "Normal", 4: "High", 5: "Top" };
  const assessmentFor = (subjectId: string) => subjectAssessments.find((assessment) => assessment.subjectId === subjectId);
  const priorityFor = (subjectId: string) => assessmentFor(subjectId)?.priority ?? 3;
  const changePriority = async (subjectId: string, value: string) => {
    const priority = Number(value) as SubjectAssessment["priority"];
    setPrioritySaving(subjectId);
    setPriorityError("");
    try {
      await saveSubjectPriority(subjectId, priority);
    } catch (error) {
      setPriorityError(error instanceof Error ? error.message : "Could not save subject priority");
    } finally {
      setPrioritySaving(null);
    }
  };
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
  const setDifficulty = (chapter: Chapter, difficulty: ChapterDifficulty) => {
    const updated = { ...chapter, difficulty };
    setList(list.map((item) => item.id === chapter.id ? updated : item));
    persistProgress(updated);
  };
  const listedTotal = marks.reduce((sum, item) => sum + item.marks, 0);
  const officialTotal = officialTotalFor(selected) || undefined;
  const hasConflict = Boolean(officialTotal && listedTotal && listedTotal !== officialTotal);
  return <main id="main-content" tabIndex={-1} className="page syllabus-page">
    <section className="subject-strip" aria-label="Subjects">{subjects.map((item) => { const priority = priorityFor(item.id); const saving = prioritySaving === item.id; return <article className={`subject-card ${selected === item.id ? "active" : ""}`} key={item.id}><button type="button" className="subject-card-select" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}><span>{item.shortName.slice(0, 2)}</span><strong>{item.shortName}</strong><small>{strengthLabels[subjectStrengths[item.id] ?? item.strength]} · {list.filter((chapter) => chapter.subjectId === item.id).length} topics</small></button><label className="subject-priority"><span>Priority</span><select value={priority} onChange={(event) => void changePriority(item.id, event.target.value)} disabled={saving} aria-label={`Set ${item.name} priority`}><option value="1">1 · Low</option><option value="2">2 · Light</option><option value="3">3 · Normal</option><option value="4">4 · High</option><option value="5">5 · Top</option></select><small>{saving ? "Saving…" : priorityLabels[priority]}</small></label></article>; })}</section>{priorityError && <p className="syllabus-priority-error" role="alert">{priorityError}</p>}
    <section className="syllabus-layout"><div><SectionTitle kicker={`${strengthLabels[personalStrength]} · ${subject.workflow === "accounting" ? "separate accounting workflow" : subject.workflow}`} title={subject.name}><div className="syllabus-tools"><label className="search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a chapter" aria-label="Find a chapter" /></label><div className="syllabus-tool-group"><button className={showExcluded ? "active" : ""} onClick={() => setShowExcluded(!showExcluded)}><EyeSlash /><span>{showExcluded ? "Hide excluded" : "Show excluded"}</span></button><button className={priorPanelOpen ? "active" : ""} onClick={() => setPriorPanelOpen((open) => !open)}><CheckCircle weight="fill" /><span>Prior progress</span></button><button onClick={goGoals}><Target /><span>Plan goals</span></button></div></div></SectionTitle>{priorPanelOpen && <PriorCompletionPanel list={list} subjects={subjects} save={saveCompletedChapters} close={() => setPriorPanelOpen(false)} />}<div className="chapters">{mine.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); return <article className={preference.excluded ? "excluded" : ""} key={chapter.id}><div className="chapter-row-main"><span className="number">{chapter.number ?? "•"}</span><p><strong>{chapter.title}</strong><small>{preference.excluded ? `Excluded${preference.exclusionReason ? ` · ${preference.exclusionReason}` : ""}` : [chapter.division, chapter.note].filter(Boolean).join(" · ") || chapter.formats.join(" · ")}</small></p><div className="chapter-status-actions"><button className={`status ${chapter.status}`} onClick={() => cycle(chapter)} aria-label={`Change status for ${chapter.title}`}>{chapter.status === "exam-ready" ? "Complete" : chapter.status.replace("-", " ")}</button><button className={chapter.status === "exam-ready" ? "complete-chapter undo-complete" : "complete-chapter"} onClick={() => chapter.status === "exam-ready" ? uncompleteChapter(chapter) : completeChapter(chapter)} aria-label={chapter.status === "exam-ready" ? `Undo completion for ${chapter.title}` : `Mark ${chapter.title} complete`}>{chapter.status === "exam-ready" ? <><ArrowCounterClockwise /><span>Undo complete</span></> : <><Check /><span>Mark complete</span></>}</button></div></div><div className="chapter-row-details"><div className="chapter-actions"><button className={preference.targetMonth === currentMonthKey() ? "selected" : ""} onClick={() => updatePreference({ ...preference, excluded: false, targetMonth: preference.targetMonth === currentMonthKey() ? undefined : currentMonthKey() })}><CalendarBlank /><span>Month</span></button><button className={preference.includedForSsc ? "selected" : ""} onClick={() => updatePreference({ ...preference, excluded: false, includedForSsc: !preference.includedForSsc })}><Target /><span>SSC</span></button><button type="button" className={preference.excluded ? "danger selected" : "danger"} onClick={() => updatePreference({ ...preference, excluded: !preference.excluded, includedForSsc: preference.excluded ? preference.includedForSsc : false, targetMonth: preference.excluded ? preference.targetMonth : undefined, exclusionReason: preference.excluded ? undefined : "Strategic skip" })} aria-label={preference.excluded ? `Restore ${chapter.title}` : `Exclude ${chapter.title}`} aria-pressed={preference.excluded}><span className="chapter-action-icon" aria-hidden="true">{preference.excluded ? <ArrowCounterClockwise /> : <EyeSlash />}</span><span>{preference.excluded ? "Restore" : "Exclude"}</span></button></div><DifficultyPicker value={chapter.difficulty} onChange={(difficulty) => setDifficulty(chapter, difficulty)} /><span className="confidence" role="group" aria-label={`Confidence for ${chapter.title}`}>{([1, 2, 3, 4, 5] as const).map((n) => <button type="button" className={n <= chapter.confidence ? "on" : ""} key={n} onClick={() => setConfidence(chapter, n)} aria-label={`Set confidence to ${n} out of 5`} aria-pressed={chapter.confidence === n} />)}</span></div></article>; })}</div></div><aside className="marks"><small>OFFICIAL QUESTION-TYPE DISTRIBUTION</small><h3>{officialTotal ? `${officialTotal} marks` : marks.length ? `${listedTotal} marks listed` : "Pattern pending"}</h3>{hasConflict && <p className="source-warning"><Warning weight="fill" />The source says {officialTotal} total, while its listed rows add to {listedTotal}. Kept visible for confirmation; no chapter marks were invented.</p>}{marks.length ? marks.map((mark) => <div key={`${mark.part}-${mark.questionType}`}><p><strong>{mark.questionType}</strong><small>{mark.rule}</small></p><b>{mark.marks}</b></div>) : <p>No complete readable Agriculture marks table was available. No chapter weights have been invented.</p>}</aside></section><SyllabusEvidenceMap chapters={list} sessions={sessions} entries={entries} mistakes={mistakes} resources={resources} onOpenResources={goResources} />
  </main>;
}

function GoalMetrics({ chapters }: { chapters: Chapter[] }) {
  const ready = chapters.filter((chapter) => chapter.status === "exam-ready").length;
  const active = chapters.filter((chapter) => chapter.status !== "not-started" && chapter.status !== "exam-ready").length;
  const left = chapters.filter((chapter) => chapter.status === "not-started").length;
  const percent = chapters.length ? Math.round(ready / chapters.length * 100) : 0;
  return <div className="goal-metrics"><article><small>Selected</small><strong>{chapters.length}</strong></article><article><small>Exam-ready</small><strong>{ready}</strong></article><article><small>In progress</small><strong>{active}</strong></article><article><small>Left</small><strong>{left}</strong></article><article className="wide"><small>Completion</small><i><b style={{ width: `${percent}%` }} /></i><strong>{percent}%</strong></article></div>;
}

function Goals({ list, preferences, updatePreference, updatePreferences, completeChapter, uncompleteChapter, setDifficulty, buildQueue }: { list: Chapter[]; preferences: ChapterPreference[]; updatePreference: (value: ChapterPreference) => void; updatePreferences: (values: ChapterPreference[]) => void; completeChapter: (chapter: Chapter) => void; uncompleteChapter: (chapter: Chapter) => void; setDifficulty: (chapter: Chapter, difficulty: ChapterDifficulty) => void; buildQueue: (chapters: Chapter[], label: string) => void }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [subjectId, setSubjectId] = useState("all");
  const [mode, setMode] = useState<"monthly" | "ssc" | "excluded">("ssc");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(() => new Set());
  const monthly = orderChapters(list.filter((chapter) => preferenceFor(chapter.id, preferences).targetMonth === month && !preferenceFor(chapter.id, preferences).excluded));
  const ssc = orderChapters(list.filter((chapter) => preferenceFor(chapter.id, preferences).includedForSsc && !preferenceFor(chapter.id, preferences).excluded));
  const excluded = orderChapters(list.filter((chapter) => preferenceFor(chapter.id, preferences).excluded));
  const selected = mode === "monthly" ? monthly : mode === "ssc" ? ssc : excluded;
  const candidates = orderChapters(list.filter((chapter) => subjectId === "all" || chapter.subjectId === subjectId));
  const deadline = mode === "monthly" ? new Date(new Date(`${month}T00:00:00+06:00`).getFullYear(), new Date(`${month}T00:00:00+06:00`).getMonth() + 1, 0) : new Date(`${SSC_2027_START}T00:00:00+06:00`);
  const weeks = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 604800000));
  const remaining = selected.filter((chapter) => chapter.status !== "exam-ready").length;
  const pace = Math.ceil(remaining / weeks);
  const isChosen = (chapter: Chapter) => mode === "monthly" ? preferenceFor(chapter.id, preferences).targetMonth === month : mode === "ssc" ? preferenceFor(chapter.id, preferences).includedForSsc && !preferenceFor(chapter.id, preferences).excluded : preferenceFor(chapter.id, preferences).excluded;
  const updateSelection = (chapter: Chapter, chosen: boolean) => {
    const preference = preferenceFor(chapter.id, preferences);
    if (mode === "monthly") updatePreference({ ...preference, excluded: false, exclusionReason: undefined, targetMonth: chosen ? month : undefined });
    else if (mode === "ssc") updatePreference({ ...preference, excluded: false, exclusionReason: undefined, includedForSsc: chosen });
    else updatePreference({ ...preference, excluded: chosen, includedForSsc: false, targetMonth: undefined, exclusionReason: chosen ? "Strategic skip" : undefined });
  };
  const toggleSubject = (subjectIdToChange: string) => {
    const group = candidates.filter((chapter) => chapter.subjectId === subjectIdToChange);
    const allChosen = group.length > 0 && group.every(isChosen);
    updatePreferences(group.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); const chosen = !allChosen; if (mode === "monthly") return { ...preference, excluded: false, exclusionReason: undefined, targetMonth: chosen ? month : undefined }; if (mode === "ssc") return { ...preference, excluded: false, exclusionReason: undefined, includedForSsc: chosen }; return { ...preference, excluded: chosen, includedForSsc: false, targetMonth: undefined, exclusionReason: chosen ? "Strategic skip" : undefined }; }));
  };
  const toggleExpandedSubject = (subjectIdToChange: string) => {
    setExpandedSubjects((current) => {
      const next = new Set(current);
      if (next.has(subjectIdToChange)) next.delete(subjectIdToChange);
      else next.add(subjectIdToChange);
      return next;
    });
  };
  const toggleAll = (chosen: boolean) => updatePreferences(candidates.map((chapter) => { const preference = preferenceFor(chapter.id, preferences); if (mode === "monthly") return { ...preference, excluded: false, exclusionReason: undefined, targetMonth: chosen ? month : undefined }; if (mode === "ssc") return { ...preference, excluded: false, exclusionReason: undefined, includedForSsc: chosen }; return { ...preference, excluded: chosen, includedForSsc: false, targetMonth: undefined, exclusionReason: chosen ? "Strategic skip" : undefined }; }));
  const subjectGroups = subjects.map((subject) => ({ subject, chapters: orderChapters(candidates.filter((chapter) => chapter.subjectId === subject.id)) })).filter((group) => group.chapters.length);
  const subjectSections = subjectGroups.map(({ subject, chapters }) => {
    const chosenChapters = chapters.filter(isChosen);
    const allChosen = chapters.length > 0 && chosenChapters.length === chapters.length;
    const expanded = expandedSubjects.has(subject.id);
    const contentId = `goal-subject-${subject.id}`;
    return <section className="goal-selected-subject" key={subject.id}>
      <header>
        <div className="goal-selected-subject-heading">
          <span className={`subject-token ${subject.accent}`}>{subject.shortName.slice(0, 2)}</span>
          <div>
            <strong>{subject.name}</strong>
            <small>{chosenChapters.length} of {chapters.length} {mode === "excluded" ? "excluded" : "selected"} · {chosenChapters.filter((chapter) => chapter.status === "exam-ready").length} complete</small>
          </div>
        </div>
        <button type="button" className="goal-subject-toggle" aria-expanded={expanded} aria-controls={contentId} aria-label={`${expanded ? "Collapse" : "Expand"} ${subject.name} chapters`} onClick={() => toggleExpandedSubject(subject.id)}><CaretDown weight="bold" /></button>
      </header>
      {expanded && <div className="goal-selected-content" id={contentId}>
        <div className="goal-subject-toolbar">
          <span>Manage this subject&apos;s chapters</span>
          <button type="button" onClick={() => toggleSubject(subject.id)}>{allChosen ? (mode === "excluded" ? "Clear exclusions" : "Clear subject") : (mode === "excluded" ? "Exclude all" : "Select subject")}</button>
        </div>
        {chapters.map((chapter) => {
          const chosen = isChosen(chapter);
          const preference = preferenceFor(chapter.id, preferences);
          return <div className={`goal-row ${chosen ? "" : "not-selected"}`} key={chapter.id}>
            <span className="number">{chapter.number ?? "•"}</span>
            <div className="goal-row-main">
              <p><strong>{chapter.title}</strong><small>{chapter.status === "exam-ready" ? "Completed before or during this app" : chapter.status.replace("-", " ")}</small></p>
              <span className="goal-row-summary">{chosen ? `Priority ${preference.priority} · Difficulty ${chapter.difficulty}/5` : mode === "excluded" ? "Not excluded" : "Not selected for this goal"}</span>
            </div>
            <div className="goal-row-actions">
              {chosen ? <>
                {mode !== "excluded" && <label className="priority-control"><span>Priority</span><strong className="priority-value">{preference.priority}</strong><select aria-label={`Set priority for ${chapter.title}`} value={preference.priority} onChange={(event) => updatePreference({ ...preference, priority: Number(event.target.value) as ChapterPreference["priority"] })}>{[1, 2, 3, 4, 5].map((level) => <option value={level} key={level}>{level}</option>)}</select></label>}
                <div className="goal-difficulty"><DifficultyPicker value={chapter.difficulty} onChange={(difficulty) => setDifficulty(chapter, difficulty)} /></div>
                <button className={chapter.status === "exam-ready" ? "complete-inline undo-complete" : "complete-inline"} onClick={() => chapter.status === "exam-ready" ? uncompleteChapter(chapter) : completeChapter(chapter)}>{chapter.status === "exam-ready" ? <><ArrowCounterClockwise />Undo complete</> : <><Check />Mark complete</>}</button>
                <button className="remove-goal" onClick={() => updateSelection(chapter, false)} aria-label={mode === "excluded" ? `Restore ${chapter.title}` : `Remove ${chapter.title} from goal`} title={mode === "excluded" ? "Restore chapter" : "Remove from goal"}>{mode === "excluded" ? <ArrowCounterClockwise /> : <X />}</button>
              </> : <button type="button" className="add-goal" onClick={() => updateSelection(chapter, true)}><Plus />{mode === "excluded" ? "Exclude chapter" : "Add to goal"}</button>}
            </div>
          </div>;
        })}
      </div>}
    </section>;
  });
  return <main id="main-content" tabIndex={-1} className="page goals-page">
    <SectionTitle kicker="BUILD THE SYLLABUS YOU WILL ACTUALLY STUDY" title="Strategic chapter goals"><span><Target weight="fill" />{pace} chapter{pace === 1 ? "" : "s"}/week needed</span></SectionTitle>
    <section className="panel goal-intro"><div><small>SSC 2027 TARGET CAMPAIGN</small><h3>{mode === "ssc" ? "Every chapter is included by default." : mode === "monthly" ? `${monthLabel(month)} campaign` : "Your reversible exclusions"}</h3><p>{mode === "ssc" ? "Keep all chapters selected, then exclude only the chapters you deliberately do not want in your plan." : "Use subject sections and bulk actions instead of managing a long undifferentiated list."}</p></div><div className="goal-bulk-actions">{mode !== "excluded" && <button className="accent" onClick={() => toggleAll(true)}><CheckCircle weight="fill" />Select all visible</button>}<button onClick={() => toggleAll(false)}><X />{mode === "excluded" ? "Clear exclusions" : "Clear visible"}</button></div></section>
    <section className="goal-controls"><div className="segmented">{(["monthly", "ssc", "excluded"] as const).map((item) => <button className={mode === item ? "active" : ""} key={item} onClick={() => setMode(item)}>{item === "monthly" ? "Monthly goal" : item === "ssc" ? "Before SSC" : "Excluded"}</button>)}</div>{mode === "monthly" && <label>Target month<input type="month" value={month.slice(0, 7)} onChange={(event) => setMonth(`${event.target.value}-01`)} /></label>}<label>Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label></section>
    <GoalMetrics chapters={selected} />
    <section className="goals-structured"><article className="panel goal-selected"><SectionTitle kicker={mode === "monthly" ? monthLabel(month) : mode === "ssc" ? "SSC 2027 TARGET SET" : "REVERSIBLE STRATEGIC SKIPS"} title={mode === "excluded" ? "Chapters you chose not to prepare" : "Selected chapters"}>{mode !== "excluded" && selected.length > 0 && <button className="accent" onClick={() => buildQueue(selected, mode === "monthly" ? `${monthLabel(month)} goal` : "SSC target")}><ListChecks />Build next 5</button>}</SectionTitle><div className="goal-subjects">{subjectSections.length ? subjectSections : <div className="empty compact"><Target /><h3>No chapters available.</h3><p>Choose another subject to manage its chapters.</p></div>}</div></article></section>
  </main>;
}

function StudyCalendar({ tasks, preferences, update, add, openTask }: { tasks: StudyTask[]; preferences: ChapterPreference[]; update: (task: StudyTask) => void; add: (date?: string) => void; openTask: (task: StudyTask) => void }) {
  const [month, setMonth] = useState(currentMonthKey());
  const excluded = new Set(preferences.filter((item) => item.excluded).map((item) => item.chapterId));
  const activeTasks = tasks.filter((task) => !excluded.has(task.chapterId) && task.status !== "skipped");
  const first = new Date(`${month}T00:00:00+06:00`);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const blanks = (first.getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const moveMonth = (offset: number) => setMonth(new Date(year, monthIndex + offset, 1).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit" }) + "-01");
  const unscheduled = activeTasks.filter((task) => task.status !== "completed" && !plannedDate(task));
  return <main id="main-content" tabIndex={-1} className="page calendar-page">
    <SectionTitle kicker="APP-OWNED STUDY BLOCKS ONLY" title="Study calendar"><div className="calendar-actions"><button onClick={() => moveMonth(-1)} aria-label="Previous month"><CaretLeft /></button><strong>{monthLabel(month)}</strong><button onClick={() => moveMonth(1)} aria-label="Next month"><CaretRight /></button><button className="accent" onClick={() => add()}><Plus />Add task</button></div></SectionTitle>
    <section className="calendar-health ok"><CalendarBlank weight="fill" /><p><strong>Your in-app study calendar</strong><small>Add, move, and manage study tasks here. This calendar is the source of truth for your plan.</small></p><span className="calendar-local-badge">In-app only</span></section>
    <section className="calendar-layout"><div className="month-grid"><div className="weekday-row">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div><div className="day-grid">{cells.map((day, index) => { if (!day) return <div className="day empty-cell" key={`blank-${index}`} />; const date = `${month.slice(0, 8)}${String(day).padStart(2, "0")}`; const items = activeTasks.filter((task) => plannedDate(task) === date); return <article className="day" key={date}><button className="day-number" onClick={() => add(date)}>{day}<Plus /></button>{items.slice(0, 3).map((task) => <button className={`calendar-task ${bySubject(task.subjectId).accent}`} key={task.id} onClick={() => openTask(task)} aria-label={`Open ${task.title} in today's timeline`}><strong>{task.plannedTime}</strong><span>{bySubject(task.subjectId).shortName}</span></button>)}{items.length > 3 && <small>+{items.length - 3} more</small>}</article>; })}</div></div><aside className="panel unscheduled"><SectionTitle kicker="NEEDS A DATE" title={`${unscheduled.length} unscheduled`} />{unscheduled.slice(0, 12).map((task) => <div key={task.id}><p><strong>{task.title}</strong><small>{bySubject(task.subjectId).shortName} · {task.duration} min</small></p><input type="date" aria-label={`Schedule ${task.title}`} onChange={(event) => event.target.value && update(scheduleOn(task, event.target.value))} /></div>)}{!unscheduled.length && <div className="empty compact"><CheckCircle /><h3>Everything is placed.</h3><p>Use the date controls or add a task directly in this calendar to keep your study plan up to date.</p></div>}</aside></section>
  </main>;
}

function Journal({ entries, add }: { entries: JournalEntry[]; add: () => void }) {
  return <main id="main-content" tabIndex={-1} className="page"><SectionTitle kicker="YOUR EVIDENCE, NOT A STREAK" title="Study journal"><button className="accent" onClick={add}><Plus />Add entry</button></SectionTitle><section className="journal-grid">{entries.length ? entries.map((entry) => <article key={entry.id}><span>{bySubject(entry.subjectId).shortName}</span><h3>{byChapter(entry.chapterId).title}</h3><p>{entry.reflection}</p><div><b>{entry.minutes}m</b><b>{entry.correct}/{entry.attempted}</b><b>{entry.confidenceBefore}→{entry.confidenceAfter}</b></div><small>Next: {entry.nextAction}</small></article>) : <article className="empty"><NotePencil /><h3>Record what you studied.</h3><p>Add an entry after any study session. Record the result, what was difficult, and what you will do next.</p></article>}</section></main>;
}

function Progress({ entries, list, mocks, addMock, sessions, tasks }: { entries: JournalEntry[]; list: Chapter[]; mocks: MockResult[]; addMock: () => void; sessions: StudySession[]; tasks: StudyTask[] }) {
  const evidence = summarizeStudyEvidence(sessions, entries);
  const evidenceChapterIds = new Set(evidence.map((record) => record.chapterId));
  const studiedChapters = list.filter((chapter) => chapter.status !== "not-started" || evidenceChapterIds.has(chapter.id));
  const ready = list.filter((chapter) => chapter.status === "exam-ready").length;
  const mathEvidence = evidence.filter((record) => record.subjectId === "mathematics");
  const mathsAttempted = mathEvidence.reduce((sum, record) => sum + record.attempted, 0);
  const mathsAccuracy = mathsAttempted ? Math.round(mathEvidence.reduce((sum, record) => sum + record.correct, 0) / mathsAttempted * 100) : null;
  const latestMock = [...mocks].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  const coverage = list.length ? Math.round(studiedChapters.length / list.length * 100) : 0;
  return <main id="main-content" tabIndex={-1} className="page progress-page"><SectionTitle kicker="RESULTS OVER BUSYWORK" title="Progress intelligence"><button className="accent" onClick={addMock}><Plus />Record mock</button></SectionTitle><StudyAnalytics sessions={sessions} entries={entries} tasks={tasks} /><section className="metrics">{[["Evidence coverage", `${coverage}%`, "lilac"], ["Exam-ready", ready, "mint"], ["Journal entries", entries.length, "yellow"], [latestMock ? "Latest mock" : "Maths accuracy", latestMock ? `${Math.round(latestMock.score / latestMock.total * 100)}%` : mathsAccuracy == null ? "—" : `${mathsAccuracy}%`, "pink"]].map(([label, value, tone]) => <article className={String(tone)} key={label}><small>{label}</small><strong>{value}</strong><span>Current evidence</span></article>)}</section><section className="progress-layout"><section className="panel subject-progress"><SectionTitle kicker="STUDIED CHAPTER CONFIDENCE" title="Confidence by subject" /><p className="subject-progress-explainer">Each bar averages your 1–5 confidence ratings only across chapters with study evidence. It is not a predicted exam mark. A dash means there is no evidence yet.</p>{subjects.map((subject) => { const mine = list.filter((chapter) => chapter.subjectId === subject.id); const withEvidence = mine.filter((chapter) => chapter.status !== "not-started" || evidenceChapterIds.has(chapter.id)); const averageConfidence = withEvidence.length ? withEvidence.reduce((sum, chapter) => sum + chapter.confidence, 0) / withEvidence.length : null; const score = averageConfidence == null ? null : Math.round(averageConfidence / 5 * 100); return <div className="subject-progress-row" key={subject.id}><span className="subject-progress-name"><strong>{subject.shortName}</strong><small>{withEvidence.length}/{mine.length} chapters with evidence</small></span><i role="progressbar" aria-label={`${subject.name} confidence`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score ?? 0} aria-valuetext={averageConfidence == null ? "No study evidence yet" : `${averageConfidence.toFixed(1)} out of 5 average confidence`}><b className={subject.accent} style={{ width: `${score ?? 0}%` }} /></i><strong>{averageConfidence == null ? "—" : `${averageConfidence.toFixed(1)}/5`}</strong></div>; })}</section><aside className="panel mock-history"><SectionTitle kicker="EXAM EVIDENCE" title="Mock results" />{mocks.length ? [...mocks].sort((a, b) => b.takenAt.localeCompare(a.takenAt)).slice(0, 6).map((mock) => <article key={mock.id}><p><strong>{bySubject(mock.subjectId).shortName}</strong><small>{mock.paperType} · {new Date(mock.takenAt).toLocaleDateString("en-GB")}</small></p><b>{mock.score}/{mock.total}</b></article>) : <div className="empty compact"><Exam /><h3>No mock results yet.</h3><p>Record a full paper or timed section to strengthen recommendations.</p></div>}</aside></section></main>;
}

function RevisionModal({ mistake, close, save }: { mistake: Mistake; close: () => void; save: (outcome: "solved" | "needs-work", note: string) => void }) {
  const [outcome, setOutcome] = useState<"solved" | "needs-work">("solved");
  const [note, setNote] = useState("");
  const delay = outcome === "solved" ? 7 : revisionDelayDays(mistake.revisionCount ?? 0);
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="revision-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); save(outcome, note); }}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>DELIBERATE RETRIEVAL</small><h2 id="revision-title">Reattempt this mistake</h2><p className="revision-prompt">{mistake.prompt}</p><small>{byChapter(mistake.chapterId).title} · {mistake.errorType} · {mistake.revisionCount ?? 0} previous attempt{(mistake.revisionCount ?? 0) === 1 ? "" : "s"}</small><label>What happened?<select autoFocus value={outcome} onChange={(event) => setOutcome(event.target.value as "solved" | "needs-work")}><option value="solved">Solved without help</option><option value="needs-work">Still needs work</option></select></label><label>Revision note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What made the answer work, or where did you get stuck?" /></label><p className="revision-next">{outcome === "solved" ? "Closes this item and schedules a light 7-day check." : `Keeps it open and schedules another focused attempt in ${delay} day${delay === 1 ? "" : "s"}.`}</p><button className="solid-cta"><CheckCircle weight="fill" />Save revision attempt</button></form></div>;
}

function ExamPlan({ plan, save }: { plan: ExamPlanPhase[]; save: (phases: ExamPlanPhase[]) => Promise<void> }) {
  const defaultPlan = recommendedExamPlan(SSC_2027_START);
  const [draft, setDraft] = useState<ExamPlanPhase[]>(() => plan.length ? plan : defaultPlan);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
  const current = draft.findIndex((phase) => today >= phase.start && today <= phase.end);
  const update = (id: string, patch: Partial<ExamPlanPhase>) => setDraft((currentPlan) => currentPlan.map((phase) => phase.id === id ? { ...phase, ...patch } : phase));
  const move = (index: number, direction: -1 | 1) => setDraft((currentPlan) => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= currentPlan.length) return currentPlan; const next = [...currentPlan]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next.map((phase, order) => ({ ...phase, order })); });
  const remove = (id: string) => setDraft((currentPlan) => currentPlan.filter((phase) => phase.id !== id).map((phase, order) => ({ ...phase, order })));
  const add = () => { const index = draft.length; const start = draft.at(-1)?.end ?? today; const endDate = new Date(`${start}T00:00:00+06:00`); endDate.setUTCDate(endDate.getUTCDate() + 14); const end = endDate.toISOString().slice(0, 10); setDraft([...draft, { id: `phase-custom-${crypto.randomUUID()}`, title: "New phase", start, end, objective: "What should this phase help you accomplish?", order: index }]); };
  const useRecommended = () => { const next = recommendedExamPlan(SSC_2027_START); setDraft(next); setMessage("Recommended phases restored for the official SSC start date. Edit them before saving."); };
  const saveDraft = async () => {
    const clean = draft.map((phase, order) => ({ ...phase, title: phase.title.trim(), objective: phase.objective.trim(), order })).filter((phase) => phase.title && phase.start && phase.end && phase.objective);
    if (!clean.length) return setMessage("Keep at least one complete phase.");
    if (clean.some((phase) => phase.end < phase.start)) return setMessage("Each phase must end on or after its start date.");
    setBusy(true);
    setMessage("");
    try { await save(clean); setDraft(clean); setMessage("Your exam timeline is saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your exam timeline."); } finally { setBusy(false); }
  };
  return <main id="main-content" tabIndex={-1} className="page exam-plan-page"><SectionTitle kicker="YOUR DATES, YOUR CAMPAIGN" title="Exam plan"><div className="exam-plan-actions"><label>Official SSC start<input type="date" value={SSC_2027_START} readOnly aria-readonly="true" /></label><button type="button" onClick={useRecommended}>Use recommended phases</button><button type="button" className="accent" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save timeline"}</button></div></SectionTitle><section className="exam-plan-intro"><div><small>STUDENT-OWNED TIMELINE</small><h3>Plan the journey, then let the daily planner work inside it.</h3><p>Change the phase names, dates, and purpose to match your school schedule, coaching plan, or personal target. The official SSC date stays fixed while your preparation phases remain yours.</p></div><span>{draft.length} phase{draft.length === 1 ? "" : "s"}<small>{current >= 0 ? ` · ${draft[current]?.title} now` : " · ready to start"}</small></span></section><section className="exam-plan-editor">{draft.map((phase, index) => <article className={`exam-plan-phase ${current === index ? "current" : ""}`} key={phase.id}><div className="exam-plan-phase-index"><span>{current > index ? <Check weight="bold" /> : index + 1}</span><small>{current === index ? "CURRENT" : phaseDateLabel(phase.start, phase.end)}</small></div><div className="exam-plan-phase-fields"><label>Phase name<input value={phase.title} onChange={(event) => update(phase.id, { title: event.target.value })} /></label><label>Purpose<textarea value={phase.objective} onChange={(event) => update(phase.id, { objective: event.target.value })} rows={2} /></label><div className="exam-plan-date-row"><label>Starts<input type="date" value={phase.start} onChange={(event) => update(phase.id, { start: event.target.value })} /></label><label>Ends<input type="date" value={phase.end} onChange={(event) => update(phase.id, { end: event.target.value })} /></label></div></div><div className="exam-plan-phase-actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move phase up"><CaretUp /></button><button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label="Move phase down"><CaretDown /></button><button type="button" onClick={() => remove(phase.id)} disabled={draft.length <= 1}>Remove</button></div></article>)}<button type="button" className="exam-plan-add" onClick={add}><Plus />Add phase</button></section>{message && <p className="exam-plan-message" role="status">{message}</p>}</main>;
}

function WorkflowPresetEditor({ presets, save }: { presets: WorkflowPreset[]; save: (presets: WorkflowPreset[]) => Promise<void> }) {
  const [phase, setPhase] = useState<StudyPhase>("learn");
  const [subjectType, setSubjectType] = useState<WorkflowPreset["subjectType"]>("theory");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<string[]>(recommendedWorkflow("learn", undefined, "theory"));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const builtInPresets = defaultWorkflowPresets.map((preset, index) => ({ ...preset, id: `builtin-${index}` }));
  const visibleUserPresets = presets.filter((preset) => preset.phase === phase && preset.subjectType === subjectType);
  const visibleBuiltInPresets = builtInPresets.filter((preset) => preset.phase === phase && preset.subjectType === subjectType);
  const loadPreset = (preset: WorkflowPreset) => { setSelectedId(preset.id); setName(preset.name); setDescription(preset.description); setPhase(preset.phase); setSubjectType(preset.subjectType); setDraft([...preset.steps]); setStatus(""); };
  const chooseContext = (nextPhase: StudyPhase, nextSubjectType: WorkflowPreset["subjectType"]) => { setPhase(nextPhase); setSubjectType(nextSubjectType); setSelectedId(""); setName(""); setDescription(""); setDraft(recommendedWorkflow(nextPhase, undefined, nextSubjectType)); setStatus(""); };
  const updateStep = (index: number, value: string) => setDraft((current) => current.map((step, stepIndex) => stepIndex === index ? value : step));
  const removeStep = (index: number) => setDraft((current) => current.length <= 1 ? current : current.filter((_, stepIndex) => stepIndex !== index));
  const moveStep = (index: number, direction: -1 | 1) => setDraft((current) => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= current.length) return current; const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next; });
  const saveDraft = async () => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanSteps = draft.map((step) => step.trim()).filter(Boolean).slice(0, 8);
    if (!cleanName) return setStatus("Give this preset a name so you can recognise it later.");
    if (!cleanSteps.length) return setStatus("Keep at least one practical step in this preset.");
    const preset: WorkflowPreset = { id: selectedId && !selectedId.startsWith("builtin-") ? selectedId : crypto.randomUUID(), name: cleanName, description: cleanDescription, phase, subjectType, steps: cleanSteps, updatedAt: new Date().toISOString() };
    const duplicate = presets.find((item) => item.id !== preset.id && item.phase === phase && item.subjectType === subjectType && item.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    if (duplicate) return setStatus("A preset with this name already exists in this workflow. Open it to edit it, or choose another name.");
    setSaving(true);
    try { await save([...presets.filter((item) => item.id !== preset.id), preset]); setSelectedId(preset.id); setStatus("Preset saved. Choose it from the Preset menu when you create a task."); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save this reusable preset."); } finally { setSaving(false); }
  };
  const deletePreset = async () => {
    if (!selectedId || selectedId.startsWith("builtin-")) return;
    try { await save(presets.filter((preset) => preset.id !== selectedId)); chooseContext(phase, subjectType); setStatus("Preset deleted."); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not delete this preset."); }
  };
  const reset = () => { setSelectedId(""); setName(""); setDescription(""); setDraft(recommendedWorkflow(phase, undefined, subjectType)); setStatus("Starting steps loaded. Name this preset, edit the steps, then save it."); };
  return <article id="study-workflows" className="settings-editor workflow-editor"><span className="blue"><ListChecks /></span><div className="workflow-editor-body"><p><strong>Task workflows and presets</strong><small>Chaptr automatically chooses a theoretical or mathematical workflow from the task subject. Create a preset here only when you want a reusable alternative, then choose it while adding a task.</small></p><div className="workflow-context-picker"><label>1. Workflow type<select value={subjectType} onChange={(event) => chooseContext(phase, event.target.value as WorkflowPreset["subjectType"])}><option value="theory">Theoretical workflow</option><option value="mathematical">Mathematical workflow</option><option value="custom">Custom mixed workflow</option></select><small>Mathematical is the automatic default for Mathematics, Higher Mathematics, and Accounting.</small></label><div><small>2. Study goal</small><div className="workflow-tabs" role="tablist" aria-label="Study goal"><span>{studyPhases.map((item) => <button type="button" key={item.id} role="tab" aria-selected={phase === item.id} className={phase === item.id ? "active" : ""} onClick={() => chooseContext(item.id, subjectType)}>{item.label}</button>)}</span></div></div></div><div className="workflow-preset-library"><div className="workflow-library-group"><small>YOUR SAVED PRESETS</small><div className="workflow-preset-list">{visibleUserPresets.length ? visibleUserPresets.map((preset) => <button type="button" key={preset.id} className={selectedId === preset.id ? "active" : ""} onClick={() => loadPreset(preset)}><strong>{preset.name}</strong><span>Edit saved preset</span></button>) : <small>No saved presets for this workflow yet.</small>}</div></div><div className="workflow-library-group"><small>SYSTEM STARTING POINT</small><div className="workflow-preset-list">{visibleBuiltInPresets.length ? visibleBuiltInPresets.map((preset) => <button type="button" key={preset.id} className={selectedId === preset.id ? "active" : ""} onClick={() => loadPreset(preset)}><strong>{preset.name}</strong><span>Copy and customize</span></button>) : <small>Use the practical starting flow below.</small>}</div></div><button type="button" onClick={reset}><Plus />New preset</button></div><div className="workflow-preset-fields"><label>3. Preset name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Tutor + textbook + board questions" /></label><label className="wide">When should you use it?<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Optional note shown when you choose this preset." /></label></div><div className="workflow-editor-heading"><div><strong>4. Edit the steps</strong><small>{studyPhases.find((item) => item.id === phase)?.detail}</small></div><button type="button" onClick={reset}>Reset starting steps</button></div><div className="workflow-step-editor">{draft.map((step, index) => <div className="workflow-step-row" key={`${selectedId || "draft"}-${index}`}><span>{index + 1}</span><input value={step} onChange={(event) => updateStep(index, event.target.value)} aria-label={`Step ${index + 1}`} /><button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label="Move step up"><CaretUp /></button><button type="button" onClick={() => moveStep(index, 1)} disabled={index === draft.length - 1} aria-label="Move step down"><CaretDown /></button><button type="button" onClick={() => removeStep(index)} disabled={draft.length <= 1} aria-label="Remove step"><X /></button></div>)}</div><div className="workflow-editor-actions"><button type="button" onClick={() => draft.length < 8 && setDraft((current) => [...current, "Add a concrete action"])} disabled={draft.length >= 8}><Plus />Add step</button><button type="button" className="accent" onClick={() => void saveDraft()} disabled={saving}>{saving ? "Saving preset…" : selectedId && !selectedId.startsWith("builtin-") ? "Save preset changes" : "Save new preset"}</button>{selectedId && !selectedId.startsWith("builtin-") && <button type="button" onClick={() => void deletePreset()} disabled={saving}>Delete preset</button>}</div>{status && <small className="settings-message" role="status">{status}</small>}</div></article>;
}

function Settings({ planning, setPlanning, profile, saveProfile, learningPreferences, saveAdaptive, workflowPresets, saveWorkflowPresets, onSignOut }: { planning: PlanningSettings; setPlanning: (value: PlanningSettings) => void; profile: UserProfile; saveProfile: (patch: Partial<UserProfile>) => Promise<void>; learningPreferences: LearningPreferences; saveAdaptive: (patch: Partial<LearningPreferences>, assessments?: SubjectAssessment[]) => Promise<void>; workflowPresets: WorkflowPreset[]; saveWorkflowPresets: (presets: WorkflowPreset[]) => Promise<void>; onSignOut: () => Promise<void> }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [guidanceMode, setGuidanceMode] = useState(learningPreferences.guidanceMode);
  const [planStrictness, setPlanStrictness] = useState(learningPreferences.planStrictness);
  const [sessionLength, setSessionLength] = useState(learningPreferences.sessionLengthMinutes);
  const [weekdayMinutes, setWeekdayMinutes] = useState(learningPreferences.weekdayMinutes);
  const [weekendMinutes, setWeekendMinutes] = useState(learningPreferences.weekendMinutes);
  const [mostDifficultSubjectId, setMostDifficultSubjectId] = useState(profile.mostDifficultSubjectId ?? "");
  const [subjectStrengths, setSubjectStrengths] = useState<Record<string, StrengthLevel>>(profile.subjectStrengths ?? {});
  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;
    void client.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  const updateProfile = async () => { try { await saveProfile({ displayName: displayName.trim() || undefined }); setMessage("Profile updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Profile update failed."); } };
  const updateAdaptive = async () => { try { await saveAdaptive({ guidanceMode, planStrictness, sessionLengthMinutes: sessionLength, weekdayMinutes, weekendMinutes }); setMessage("Your daily capacity and planning preferences were updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update planning preferences."); } };
  const updateMostDifficult = async () => { try { await saveProfile({ mostDifficultSubjectId: mostDifficultSubjectId || undefined }); setMessage("Your personal difficulty signal was updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your difficulty signal."); } };
  const updateSubjectStrengths = async () => { try { await saveProfile({ subjectStrengths }); setMessage("Your subject strengths were updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your subject strengths."); } };
  const restartOnboarding = async () => { try { await saveProfile({ onboardingStep: 0, onboardingCompleted: false }); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not restart setup."); } };
  const enableReminders = async () => {
    if (!("Notification" in window)) return setMessage("This browser does not support notifications.");
    const permission = await Notification.requestPermission();
    setPlanning({ remindersEnabled: permission === "granted" });
    setMessage(permission === "granted" ? "Reminders enabled. Calendar reminders remain the reliable option when the app is closed." : "Notification permission was not granted.");
  };
  return <main id="main-content" tabIndex={-1} className="page settings-page"><SectionTitle kicker="PRIVATE BY DEFAULT" title="Planning settings" /><section className="settings">
    <article className="auth-card account-card"><span className="lilac"><CloudCheck /></span><div><p><strong>{email ? "Cloud account connected" : "Cloud account"}</strong><small>{email ?? "Your account email"}</small></p><label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label><div className="settings-actions"><button onClick={updateProfile}>Save profile</button><button onClick={restartOnboarding}>Restart setup</button><button type="button" onClick={() => void onSignOut()}><SignOut />Sign out</button></div></div></article>
    <article className="settings-editor adaptive-settings capacity-settings"><span className="blue"><Brain /></span><p><strong>Daily capacity and planning</strong><small>Chaptr builds each day inside these limits, then gives extra weight to difficult subjects, low-progress chapters, due reviews, mistakes, and your feedback.</small></p><div className="inline-fields capacity-fields"><label>Sunday–Thursday<select value={weekdayMinutes} onChange={(event) => setWeekdayMinutes(Number(event.target.value))}><option value="60">60 min/day</option><option value="90">90 min/day</option><option value="120">2 hours/day</option><option value="180">3 hours/day</option><option value="240">4 hours/day</option></select></label><label>Friday–Saturday<select value={weekendMinutes} onChange={(event) => setWeekendMinutes(Number(event.target.value))}><option value="90">90 min/day</option><option value="120">2 hours/day</option><option value="180">3 hours/day</option><option value="240">4 hours/day</option><option value="300">5 hours/day</option></select></label><label>Preferred focus block<select value={sessionLength} onChange={(event) => setSessionLength(Number(event.target.value))}><option value="25">25 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label><label>Guidance<select value={guidanceMode} onChange={(event) => setGuidanceMode(event.target.value as LearningPreferences["guidanceMode"])}><option value="guided">Guide me</option><option value="balanced">Balanced</option><option value="quiet">Quiet queue</option></select></label><label>Plan style<select value={planStrictness} onChange={(event) => setPlanStrictness(event.target.value as LearningPreferences["planStrictness"])}><option value="flexible">Flexible</option><option value="balanced">Balanced</option><option value="strict">Strict</option></select></label></div><p className="capacity-derived-note">A usual Sunday–Thursday day becomes about {Math.max(1, Math.ceil(weekdayMinutes / sessionLength))} focus block{Math.ceil(weekdayMinutes / sessionLength) === 1 ? "" : "s"}. You never need to maintain a separate session count.</p><div className="settings-actions adaptive-actions"><button type="button" className="accent" onClick={updateAdaptive}>Save daily capacity</button><button type="button" onClick={restartOnboarding}>Run calibration again</button></div></article>
    <article className="settings-editor personal-difficulty-settings"><span className="yellow"><Target /></span><p><strong>Your subject strengths</strong><small>Rate each selected subject from Strongest to Toughest. These labels personalize your Syllabus and gently shape planning priorities.</small></p><div className="settings-strength-list">{subjects.filter((subject) => profile.selectedSubjects.includes(subject.id)).map((subject) => <label key={subject.id}><span>{subject.name}</span><select aria-label={`${subject.name} strength`} value={subjectStrengths[subject.id] ?? ""} onChange={(event) => setSubjectStrengths((current) => ({ ...current, [subject.id]: event.target.value as StrengthLevel }))}><option value="">Choose level</option>{strengthLevels.map((level) => <option key={level} value={level}>{strengthLabels[level]}</option>)}</select></label>)}</div><div className="settings-actions"><button type="button" className="accent" onClick={updateSubjectStrengths}>Save subject strengths</button></div></article>
    <article className="settings-editor personal-difficulty-settings"><span className="yellow"><Target /></span><p><strong>Your most difficult subject</strong><small>This optional signal gives one subject a little extra protection in your daily plan.</small></p><div className="inline-fields"><label>Subject<select value={mostDifficultSubjectId} onChange={(event) => setMostDifficultSubjectId(event.target.value)}><option value="">I do not have one right now</option>{subjects.filter((subject) => profile.selectedSubjects.includes(subject.id)).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label></div><div className="settings-actions"><button type="button" className="accent" onClick={updateMostDifficult}>Save difficulty signal</button></div></article>
    <WorkflowPresetEditor presets={workflowPresets} save={saveWorkflowPresets} />

    <article><span className="blue"><Warning /></span><p><strong>Study reminders</strong><small>{planning.remindersEnabled ? "Browser permission granted." : "Optional browser and install reminders."}</small></p><button onClick={enableReminders}>{planning.remindersEnabled ? "Enabled" : "Enable"}</button></article>
    <article className="settings-editor settings-privacy-link"><span className="pink"><Headphones /></span><p><strong>Support and account privacy</strong><small>Search help, send a private support request, or request deletion of your Chaptr account.</small></p><button type="button" onClick={() => router.push("/support")}>Open Support <ArrowRight /></button></article>
    {message && <p className="settings-message">{message}</p>}
  </section></main>;
}

const pickerHours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const pickerMinutes = ["00", "15", "30", "45"] as const;
const pickerPeriods = ["AM", "PM"] as const;
type PickerPeriod = (typeof pickerPeriods)[number];

function TimePicker({ value, onChange, invalid }: { value: string; onChange: (value: string) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const parsedHour = Number(value.slice(0, 2));
  const hour = String(parsedHour % 12 || 12);
  const minute = value.slice(3, 5) || "00";
  const period: PickerPeriod = parsedHour >= 12 ? "PM" : "AM";
  const updateTime = (nextHour: string, nextMinute: string, nextPeriod: PickerPeriod) => {
    const hour24 = Number(nextHour) % 12 + (nextPeriod === "PM" ? 12 : 0);
    onChange(`${String(hour24).padStart(2, "0")}:${nextMinute}`);
  };
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);
  return <div ref={rootRef} className="time-picker">
    <button type="button" className={`time-picker-trigger${invalid ? " invalid" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={`Planned time: ${displayTime(value)}`} onClick={() => setOpen((current) => !current)}>
      <Clock aria-hidden="true" />
      <span>{displayTime(value)}</span>
      <CaretDown aria-hidden="true" />
    </button>
    {open && <div className="time-picker-popover" role="dialog" aria-label="Choose a planned time">
      <div className="time-picker-heading"><div><small>SET A TIME</small><strong>{displayTime(value)}</strong></div><button type="button" className="time-picker-close" onClick={() => setOpen(false)} aria-label="Close time picker"><X /></button></div>
      <div className="time-picker-columns">
        <div className="time-picker-column"><span>Hour</span><div className="time-picker-options">{pickerHours.map((option) => <button type="button" key={option} className={hour === option ? "selected" : ""} onClick={() => updateTime(option, minute, period)} aria-pressed={hour === option}>{option}</button>)}</div></div>
        <div className="time-picker-column"><span>Minute</span><div className="time-picker-options">{pickerMinutes.map((option) => <button type="button" key={option} className={minute === option ? "selected" : ""} onClick={() => updateTime(hour, option, period)} aria-pressed={minute === option}>{option}</button>)}</div></div>
        <div className="time-picker-column"><span>Period</span><div className="time-picker-options period">{pickerPeriods.map((option) => <button type="button" key={option} className={period === option ? "selected" : ""} onClick={() => updateTime(hour, minute, option)} aria-pressed={period === option}>{option}</button>)}</div></div>
      </div>
      <button type="button" className="time-picker-done" onClick={() => setOpen(false)}>Done</button>
    </div>}
  </div>;
}

function ManualTaskModal({ close, save, configurePresets, defaultDate, preferences, workflowPresets, preferredMethods }: { close: () => void; save: (task: StudyTask) => void; configurePresets: () => void; defaultDate?: string; preferences: ChapterPreference[]; workflowPresets: WorkflowPreset[]; preferredMethods: LearningMethod[] }) {
  const selectable = chapters.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded);
  const selectableSubjects = subjects.filter((subject) => selectable.some((chapter) => chapter.subjectId === subject.id));
  const initialSubject = selectable[0]?.subjectId ?? "mathematics";
  const [subjectId, setSubjectId] = useState(initialSubject);
  const available = selectable.filter((chapter) => chapter.subjectId === subjectId);
  const [chapterId, setChapterId] = useState(available[0]?.id ?? selectable[0]?.id ?? chapters[0]?.id ?? "");
  const [time, setTime] = useState("15:00");
  const [duration, setDuration] = useState(45);
  const [date, setDate] = useState(defaultDate ?? "");
  const [formError, setFormError] = useState("");
  const [phase, setPhase] = useState<StudyPhase>("learn");
  const [workflowType, setWorkflowType] = useState<WorkflowPreset["subjectType"]>(() => workflowSubjectType(initialSubject));
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const presetOptions = workflowPresets.filter((preset) => preset.phase === phase && preset.subjectType === workflowType);
  const stepsForSelection = (nextPhase: StudyPhase, nextWorkflowType: WorkflowPreset["subjectType"], presetId = "") => workflowPresets.find((preset) => preset.id === presetId && preset.phase === nextPhase && preset.subjectType === nextWorkflowType)?.steps ?? recommendedWorkflow(nextPhase, undefined, nextWorkflowType, preferredMethods);
  const [steps, setSteps] = useState<string[]>(() => recommendedWorkflow("learn", undefined, workflowSubjectType(initialSubject), preferredMethods));
  const chooseWorkflow = (nextPhase: StudyPhase, nextWorkflowType: WorkflowPreset["subjectType"], presetId = "") => { setPhase(nextPhase); setWorkflowType(nextWorkflowType); setSelectedPresetId(presetId); setSteps([...stepsForSelection(nextPhase, nextWorkflowType, presetId)]); };
  const changePhase = (nextPhase: StudyPhase) => chooseWorkflow(nextPhase, workflowType);
  const selectedPreset = workflowPresets.find((preset) => preset.id === selectedPresetId);
  const updateStep = (index: number, value: string) => setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? value : step));
  const moveStep = (index: number, direction: -1 | 1) => setSteps((current) => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= current.length) return current; const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next; });
  const removeStep = (index: number) => setSteps((current) => current.length <= 1 ? current : current.filter((_, stepIndex) => stepIndex !== index));
  const addStep = () => setSteps((current) => current.length >= 8 ? current : [...current, "New step"]);
  const submitTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date) { setFormError("Choose a date before adding the task."); return; }
    if (!time) { setFormError("Choose a planned time before adding the task."); return; }
    const chapter = byChapter(chapterId);
    const cleanSteps = steps.map((step) => step.trim()).filter(Boolean).slice(0, 8);
    const task: StudyTask = { id: crypto.randomUUID(), subjectId, chapterId, title: chapter.title, plannedTime: displayTime(time), duration, origin: "manual", pinned: true, status: "planned", currentStep: 0, reason: selectedPreset ? `${selectedPreset.name} · pinned first` : "Manual priority · pinned first", priorityScore: 100, focusedSeconds: 0, workflowPhase: phase, workflowSteps: cleanSteps.length ? cleanSteps : recommendedWorkflow(phase, undefined, workflowType, preferredMethods) };
    save(scheduleOn(task, date, time));
  };
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-task-title" onKeyDown={(event) => { if (event.key === "Escape") close(); }}><button className="modal-scrim" onClick={close} aria-label="Close" /><form className="manual-task-form" onSubmit={submitTask}><button type="button" className="modal-close" onClick={close} aria-label="Close dialog"><X /></button><small>MANUAL CONTROL</small><h2 id="manual-task-title">Add a study task</h2><p className="modal-intro">Choose the subject and goal. Chaptr picks the suitable workflow automatically, or you can use one of your saved presets.</p><label>Subject<select autoFocus value={subjectId} onChange={(event) => { const nextSubject = event.target.value; const nextChapter = selectable.find((chapter) => chapter.subjectId === nextSubject); const nextWorkflowType = workflowSubjectType(nextSubject); setSubjectId(nextSubject); if (nextChapter) setChapterId(nextChapter.id); chooseWorkflow(phase, nextWorkflowType); }}>{selectableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>{available.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.number ? `${chapter.number}. ` : ""}{chapter.title}</option>)}</select></label><div className="form-row"><label>Date<input required type="date" value={date} onChange={(event) => { setDate(event.target.value); setFormError(""); }} /></label><label>Planned time<TimePicker value={time} onChange={(value) => { setTime(value); setFormError(""); }} invalid={Boolean(formError && !time)} /></label><label>Minutes<input required type="number" min="10" max="240" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label></div>{formError && <p className="manual-task-error" role="alert">{formError}</p>}<section className="task-workflow-editor"><div className="task-workflow-heading"><div><strong>Workflow for this task</strong><small>The subject sets the default. Your choice below changes only this task.</small></div><button type="button" onClick={configurePresets}><SlidersHorizontal />Configure presets</button></div><div className="task-workflow-config"><label>Workflow type<select value={workflowType} onChange={(event) => chooseWorkflow(phase, event.target.value as WorkflowPreset["subjectType"])}><option value="theory">Theoretical workflow</option><option value="mathematical">Mathematical workflow</option><option value="custom">Custom mixed workflow</option></select><small>{workflowSubjectType(subjectId) === "mathematical" ? "Automatically selected for Mathematics, Higher Mathematics, and Accounting." : "Automatically selected for this reading and explanation-based subject."}</small></label><label>Preset<select value={selectedPresetId} onChange={(event) => chooseWorkflow(phase, workflowType, event.target.value)}><option value="">System recommended</option>{presetOptions.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select><small>{presetOptions.length ? `${presetOptions.length} saved preset${presetOptions.length === 1 ? "" : "s"} available for this workflow.` : "No saved preset for this workflow yet. You can still edit the generated steps below."}</small></label></div><div className="task-workflow-context"><span>{selectedPreset ? "YOUR SAVED PRESET" : "SYSTEM RECOMMENDED"}</span><strong>{selectedPreset?.name ?? (workflowType === "mathematical" ? "Mathematical subject workflow" : workflowType === "theory" ? "Theoretical subject workflow" : "Custom mixed starting flow")}</strong><small>{selectedPreset?.description || (preferredMethods.length ? `Uses your methods: ${preferredMethods.map(methodLabel).join(" · ")}.` : "Uses textbook and board-question study methods.")}</small></div><div className="task-workflow-tabs" role="tablist" aria-label="Task study goal">{studyPhases.map((item) => <button type="button" role="tab" aria-selected={phase === item.id} key={item.id} className={phase === item.id ? "active" : ""} onClick={() => changePhase(item.id)}>{item.label}</button>)}</div><div className="task-workflow-steps">{steps.map((step, index) => <div className="task-workflow-row" key={`${phase}-${workflowType}-${selectedPresetId || "system"}-${index}`}><span>{index + 1}</span><textarea value={step} onChange={(event) => updateStep(index, event.target.value)} aria-label={`Task step ${index + 1}`} rows={2} /><button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label="Move task step up"><CaretUp /></button><button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} aria-label="Move task step down"><CaretDown /></button><button type="button" onClick={() => removeStep(index)} disabled={steps.length <= 1} aria-label="Remove task step"><X /></button></div>)}</div><div className="task-workflow-footer"><button type="button" className="task-workflow-add" onClick={addStep} disabled={steps.length >= 8}><Plus />Add step</button><button type="button" className="task-workflow-reset" onClick={() => chooseWorkflow(phase, workflowSubjectType(subjectId))}>Use subject default</button></div></section><button className="solid-cta"><Plus />Add and pin first</button></form></div>;
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
  if (status === "loading") return <main className="workspace-transition" aria-live="polite" aria-busy="true"><span className="sr-only">Preparing your Chaptr workspace</span></main>;
  return <main className="database-gate" aria-live="polite"><section className="panel"><CloudCheck size={42} weight="fill" /><small>SUPABASE WORKSPACE</small><h1>Database connection required</h1><p>{error}</p><Button size="lg" className="solid-cta" onClick={() => location.reload()}><ArrowCounterClockwise />Retry database connection</Button></section></main>;
}

export default function CommandCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const pathSection = routeSections[pathname?.split("/")[1] ?? "home"] ?? "Home";
  const active = pathSection;
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  const [menu, setMenu] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const navigate = (value: string) => {
    const nextPath = sectionRoutes[value] ?? "/home";
    setMenu(false);
    setMobileMoreOpen(false);
    if (pathname !== nextPath) router.push(nextPath);
  };
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
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [curatedTextbooks, setCuratedTextbooks] = useState<CuratedTextbook[]>([]);
  const [examPlan, setExamPlan] = useState<ExamPlanPhase[]>([]);
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);
  const [planning, setPlanning] = useState<PlanningSettings>({ remindersEnabled: false });
  const [preferences, setPreferences] = useState<ChapterPreference[]>([]);
  const [learningPreferences, setLearningPreferences] = useState<LearningPreferences>({ userId: "", preferredMethods: ["textbook", "question-bank"], preferredResourceKinds: ["textbook", "question-bank"], sessionLengthMinutes: 45, weekdayMinutes: 120, weekendMinutes: 180, targetGrade: "A", guidanceMode: "guided", planStrictness: "flexible", instructionRatio: 30, practiceRatio: 50, reviewRatio: 20, createdAt: "", updatedAt: "" });
  const [subjectAssessments, setSubjectAssessments] = useState<SubjectAssessment[]>([]);
  const [recommendationFeedback, setRecommendationFeedback] = useState<RecommendationFeedback[]>([]);
  const [studyWorkflows, setStudyWorkflows] = useState<CustomStudyWorkflow[]>([]);
  const [workflowPresets, setWorkflowPresets] = useState<WorkflowPreset[]>([]);
  const [journalTask, setJournalTask] = useState<StudyTask | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState<string | undefined>();
  const [mockOpen, setMockOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [resourceChapterId, setResourceChapterId] = useState<string | undefined>();
  const [revisionMistake, setRevisionMistake] = useState<Mistake | null>(null);
  const [planSummary, setPlanSummary] = useState<AdaptivePlanSummary | null>(null);
  const [plannerState, setPlannerState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [plannerMessage, setPlannerMessage] = useState("");
  const autoPlanDateRef = useRef("");
  const [databaseStatus, setDatabaseStatus] = useState<"loading" | "ready" | "auth-required" | "error">("loading");
  const [databaseError, setDatabaseError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const clearWorkspaceState = () => {
    setTasks([]);
    setChapterList([]);
    setEntries([]);
    setMistakes([]);
    setMocks([]);
    setSessions([]);
    setResources([]);
    setCuratedTextbooks([]);
    setExamPlan([]);
    setExamEvents([]);
    setPreferences([]);
    setSubjectAssessments([]);
    setRecommendationFeedback([]);
    setStudyWorkflows([]);
    setJournalTask(null);
    setManualOpen(false);
    setMockOpen(false);
    setFocusTaskId(null);
    setResourceChapterId(undefined);
    setRevisionMistake(null);
    setPlanSummary(null);
    setPlannerState("idle");
    setPlannerMessage("");
    setProfile(null);
    setDatabaseError("");
    setDatabaseStatus("auth-required");
  };
  const signOut = async () => {
    const client = createSupabaseClient();
    const request = client?.auth.signOut();
    clearWorkspaceState();
    router.replace("/auth");
    await request?.catch(() => undefined);
  };
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch("/api/sync/bootstrap", { cache: "no-store", headers: { "cache-control": "no-cache", "x-ssc-bootstrap-attempt": String(attempt + 1) } }).catch(() => null);
        if (response?.status !== 401 || attempt === 2) break;
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
      if (!response) { setDatabaseStatus("error"); setDatabaseError("The database could not be reached. Check your connection and try again."); return; }
      if (response.status === 401) { setDatabaseStatus("auth-required"); setDatabaseError("Your sign-in session is not ready yet. Please wait a moment and try again."); return; }
      if (response.status === POLICY_CONSENT_STATUS) {
        const body = await response.json().catch(() => null) as { consentPath?: string } | null;
        window.location.replace(body?.consentPath ?? "/consent?next=%2Fhome");
        return;
      }
      if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; setDatabaseStatus("error"); setDatabaseError(body?.error ?? "The database is unavailable."); return; }
      const payload = await response.json().catch(() => null) as { mode?: string; data?: Record<string, Record<string, unknown>[]> } | null;
      if (cancelled || payload?.mode !== "cloud" || !payload.data) { setDatabaseStatus("error"); setDatabaseError("The database returned an invalid workspace response."); return; }
      const data = payload.data;
      const loadedSubjects: Subject[] = (data.subjects ?? []).map((row) => ({ id: String(row.id), name: String(row.name), shortName: String(row.short_name), strength: String(row.strength_level) as Subject["strength"], weaknessScore: Number(row.priority), workflow: String(row.workflow_kind) as Subject["workflow"], accent: subjectAccent[String(row.id)] ?? "blue", category: row.category as Subject["category"], studyGroup: row.study_group as Subject["studyGroup"], religionSubject: row.religion_subject as Subject["religionSubject"], fourthSubject: row.fourth_subject as Subject["fourthSubject"], bookLanguage: "bn" }));
      const loadedChapters: Chapter[] = orderChapters((data.chapters ?? []).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), number: row.chapter_number == null ? undefined : Number(row.chapter_number), title: String(row.title), division: row.division ? String(row.division) : undefined, note: row.note ? String(row.note) : undefined, status: "not-started" as const, confidence: 1 as const, difficulty: 3 as ChapterDifficulty, formats: Array.isArray(row.question_formats) ? row.question_formats.map(String) : [], questionsAttempted: 0, questionsCorrect: 0 })));
      const loadedSubjectIds = new Set(loadedSubjects.map((subject) => subject.id));
      const loadedChapterIds = new Set(loadedChapters.map((chapter) => chapter.id));
      const loadedMarks: MarksDistribution[] = (data.marks_distributions ?? []).map((row) => ({ subjectId: String(row.subject_id), part: row.part ? String(row.part) : undefined, questionType: String(row.question_type), rule: String(row.choice_rule), marks: Number(row.marks) }));
      const loadedExams = (data.exams ?? []).map((row) => ({ id: String(row.id), name: String(row.name), start: String(row.starts_on), end: String(row.ends_on) }));
      const loadedWorkflows = Object.fromEntries((data.workflow_steps ?? []).map((row) => [String(row.workflow_kind), Array.isArray(row.steps) ? row.steps.map(String) : []])) as unknown as typeof workflowSteps;
      setCuratedTextbooks((data.curated_textbooks ?? []).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), title: String(row.title), board: String(row.board ?? "NCTB"), academicYear: Number(row.academic_year), language: "bn" as const, studyGroup: row.study_group as CuratedTextbook["studyGroup"], religionSubject: row.religion_subject as CuratedTextbook["religionSubject"], fourthSubject: row.fourth_subject as CuratedTextbook["fourthSubject"], url: String(row.url), alternateUrl: row.alternate_url ? String(row.alternate_url) : undefined, sourcePage: String(row.source_page), sourceLabel: String(row.source_label), note: row.note ? String(row.note) : undefined, sortOrder: Number(row.sort_order ?? 0) })).sort((a, b) => a.sortOrder - b.sortOrder));
      setExamPlan((data.exam_plan_phases ?? []).map((row) => ({ id: String(row.id), title: String(row.title), start: String(row.starts_on), end: String(row.ends_on), objective: String(row.objective ?? ""), order: Number(row.phase_order ?? 0) })).sort((a, b) => a.order - b.order));
      replaceAcademicData({ subjects: loadedSubjects, chapters: loadedChapters, marksDistributions: loadedMarks, exams: loadedExams, workflowSteps: loadedWorkflows });
      const progress = new Map((data.chapter_progress ?? []).map((row) => [String(row.chapter_id), row]));
      setChapterList(loadedChapters.map((chapter) => { const row = progress.get(chapter.id); return row ? { ...chapter, status: row.status as Chapter["status"], confidence: Number(row.confidence) as Chapter["confidence"], difficulty: chapterDifficulty(row.difficulty), lastStudied: row.last_studied ? String(row.last_studied) : undefined, nextReview: row.next_review ? String(row.next_review) : undefined, questionsAttempted: Number(row.questions_attempted), questionsCorrect: Number(row.questions_correct) } : chapter; }));
      setTasks((data.study_tasks ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id)) && loadedChapterIds.has(String(row.chapter_id))).map(studyTaskFromRow));
      setPreferences((data.chapter_preferences ?? []).filter((row) => loadedChapterIds.has(String(row.chapter_id))).map((row) => ({ chapterId: String(row.chapter_id), includedForSsc: Boolean(row.included_for_ssc), targetMonth: row.target_month ? String(row.target_month) : undefined, excluded: Boolean(row.excluded), exclusionReason: row.exclusion_reason ? String(row.exclusion_reason) : undefined, priority: Number(row.priority) as ChapterPreference["priority"] })));
      const learningRow = data.learning_preferences?.[0];
      if (learningRow) setLearningPreferences((current) => learningPreferencesFromRow(learningRow, current));
      setSubjectAssessments((data.subject_assessments ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id))).map((row) => ({ id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), difficulty: Number(row.difficulty) as SubjectAssessment["difficulty"], confidence: Number(row.confidence) as SubjectAssessment["confidence"], priority: Number(row.priority) as SubjectAssessment["priority"], startingPoint: String(row.starting_point) as SubjectAssessment["startingPoint"], preferredMethods: Array.isArray(row.preferred_methods) ? row.preferred_methods.map(String) as SubjectAssessment["preferredMethods"] : [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) })));
      setRecommendationFeedback((data.recommendation_feedback ?? []).filter((row) => !row.subject_id || loadedSubjectIds.has(String(row.subject_id))).map((row) => ({ id: String(row.id), userId: String(row.user_id), taskId: row.task_id ? String(row.task_id) : undefined, subjectId: row.subject_id ? String(row.subject_id) : undefined, chapterId: row.chapter_id ? String(row.chapter_id) : undefined, feedbackType: String(row.feedback_type) as RecommendationFeedback["feedbackType"], method: row.method ? String(row.method) as RecommendationFeedback["method"] : undefined, note: row.note ? String(row.note) : undefined, createdAt: String(row.created_at) })));
      setStudyWorkflows((data.study_workflows ?? []).map((row) => ({ phase: String(row.phase) as StudyPhase, steps: Array.isArray(row.steps) ? row.steps.map(String).filter(Boolean) : [], updatedAt: row.updated_at ? String(row.updated_at) : undefined })));
      setWorkflowPresets((data.study_workflow_presets ?? []).map((row) => ({ id: String(row.id), name: String(row.name), description: String(row.description ?? ""), phase: String(row.phase) as StudyPhase, subjectType: String(row.subject_type) as WorkflowPreset["subjectType"], steps: Array.isArray(row.steps) ? row.steps.map(String).filter(Boolean) : [], createdAt: row.created_at ? String(row.created_at) : undefined, updatedAt: row.updated_at ? String(row.updated_at) : undefined })));
      setEntries((data.journal_entries ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id)) && loadedChapterIds.has(String(row.chapter_id))).map((row) => ({ id: String(row.id), taskId: String(row.task_id ?? ""), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), minutes: Number(row.minutes), attempted: Number(row.attempted), correct: Number(row.correct), confidenceBefore: Number(row.confidence_before), confidenceAfter: Number(row.confidence_after), learningGoal: String(row.learning_goal ?? ""), resources: Array.isArray(row.resources) ? row.resources.map(String) : [], mistakesText: row.mistakes_text ? String(row.mistakes_text) : undefined, writtenScore: row.written_score == null ? undefined : Number(row.written_score), reflection: String(row.reflection ?? ""), nextAction: String(row.next_action ?? ""), createdAt: String(row.created_at) })));
      setMistakes((data.mistakes ?? []).filter((row) => loadedChapterIds.has(String(row.chapter_id))).map((row) => ({ id: String(row.id), chapterId: String(row.chapter_id), prompt: String(row.prompt), errorType: String(row.error_type), reattemptDate: String(row.reattempt_date ?? ""), resolved: Boolean(row.resolved), revisionCount: Number(row.revision_count ?? 0), lastAttemptedAt: row.last_attempted_at ? String(row.last_attempted_at) : undefined, lastAttemptNote: row.last_attempt_note ? String(row.last_attempt_note) : undefined })));
      setMocks((data.mock_results ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id))).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), paperType: String(row.paper_type ?? "Full paper"), score: Number(row.score), total: Number(row.total), durationMinutes: row.duration_minutes == null ? undefined : Number(row.duration_minutes), takenAt: String(row.taken_at) })));
      setSessions((data.study_sessions ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id ?? "")) && loadedChapterIds.has(String(row.chapter_id ?? ""))).map((row) => ({ id: String(row.id), taskId: String(row.task_id), subjectId: String(row.subject_id ?? ""), chapterId: String(row.chapter_id ?? ""), mode: row.mode === "exam" ? "exam" : "focus", startedAt: String(row.started_at), endedAt: row.ended_at ? String(row.ended_at) : undefined, timerState: row.timer_state === "running" || row.timer_state === "paused" || row.timer_state === "completed" ? row.timer_state : row.completed ? "completed" : "paused", lastResumedAt: row.last_resumed_at ? String(row.last_resumed_at) : undefined, focusedSeconds: Number(row.focused_seconds ?? 0), pauseSeconds: Number(row.pause_seconds ?? 0), completed: Boolean(row.completed), questionsAttempted: row.questions_attempted == null ? undefined : Number(row.questions_attempted), questionsCorrect: row.questions_correct == null ? undefined : Number(row.questions_correct) })));
      setExamSessions((data.exam_sessions ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id)) && loadedChapterIds.has(String(row.chapter_id))).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), status: row.status === "running" || row.status === "paused" || row.status === "completed" ? row.status : "draft", targetMinutes: Number(row.target_minutes ?? 45), elapsedSeconds: Number(row.elapsed_seconds ?? 0), lastResumedAt: row.last_resumed_at ? String(row.last_resumed_at) : undefined, startedAt: row.started_at ? String(row.started_at) : undefined, endedAt: row.ended_at ? String(row.ended_at) : undefined, mcqAttempted: Number(row.mcq_attempted ?? 0), mcqCorrect: Number(row.mcq_correct ?? 0), cqAttempted: Number(row.cq_attempted ?? 0), cqCorrect: Number(row.cq_correct ?? 0), sqAttempted: Number(row.sq_attempted ?? 0), sqCorrect: Number(row.sq_correct ?? 0), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })));
      setResources((data.study_resources ?? []).filter((row) => loadedSubjectIds.has(String(row.subject_id)) && loadedChapterIds.has(String(row.chapter_id))).map((row) => ({ id: String(row.id), subjectId: String(row.subject_id), chapterId: String(row.chapter_id), title: String(row.title), url: String(row.url), kind: row.kind as StudyResource["kind"], source: row.source === "upload" ? "upload" : "url", storagePath: row.storage_path ? String(row.storage_path) : undefined, fileName: row.file_name ? String(row.file_name) : undefined, mimeType: row.mime_type ? String(row.mime_type) : undefined, fileSize: row.file_size == null ? undefined : Number(row.file_size), note: row.note ? String(row.note) : undefined, archived: Boolean(row.archived), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })));
      setExamEvents((data.exam_events ?? []).map((row) => ({ id: String(row.id), name: String(row.name), start: String(row.starts_on), end: String(row.ends_on), kind: row.kind as ExamEvent["kind"], scope: Array.isArray(row.scope) ? row.scope.map(String) : [], note: row.note ? String(row.note) : undefined, locked: Boolean(row.locked), archived: Boolean(row.archived) })).filter((event) => !event.archived));
      const planningRow = data.planning_settings?.[0];
      if (planningRow) setPlanning({ remindersEnabled: Boolean(planningRow.reminders_enabled) });
      const summaryRow = data.adaptive_plan_summaries?.[0];
      if (summaryRow) setPlanSummary({ usedMinutes: Number(summaryRow.used_minutes), availableMinutes: Number(summaryRow.available_minutes), deferredCount: Number(summaryRow.deferred_count), generatedRevisionCount: Number(summaryRow.generated_revision_count), rationale: Array.isArray(summaryRow.rationale) ? summaryRow.rationale.map(String) : [], plannedAt: String(summaryRow.planned_at) });
      const profileRow = data.user_profiles?.[0];
      if (profileRow) setProfile(userProfileFromRow(profileRow));
      if (!cancelled) setDatabaseStatus("ready");
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  const persist = (table: string, rows: Record<string, unknown>[]) => { void queueCloudSync(table, rows).catch((error: unknown) => { setDatabaseStatus("error"); setDatabaseError(error instanceof Error ? error.message : "Database write failed"); }); };

  const refreshPersonalizedTasks = ({ sourceTasks = tasks, nextChapters = chapterList, nextPreferences = preferences, nextAssessments = subjectAssessments, nextFeedback = recommendationFeedback, nextMistakes = mistakes, nextMocks = mocks, nextProfile = profile, nextLearningPreferences = learningPreferences }: { sourceTasks?: StudyTask[]; nextChapters?: Chapter[]; nextPreferences?: ChapterPreference[]; nextAssessments?: SubjectAssessment[]; nextFeedback?: RecommendationFeedback[]; nextMistakes?: Mistake[]; nextMocks?: MockResult[]; nextProfile?: UserProfile | null; nextLearningPreferences?: LearningPreferences } = {}) => {
    const progressBySubject = subjectProgressMap(nextChapters.filter((chapter) => !preferenceFor(chapter.id, nextPreferences).excluded));
    const rescored = rescoreStudyTasks(sourceTasks, subjects, nextChapters, { mistakes: nextMistakes, mocks: nextMocks, assessments: nextAssessments, preferences: nextPreferences, feedback: nextFeedback, mostDifficultSubjectId: nextProfile?.mostDifficultSubjectId, subjectStrengths: nextProfile?.subjectStrengths, targetGrade: nextLearningPreferences.targetGrade, preferredMethods: nextLearningPreferences.preferredMethods, preferredSessionMinutes: nextLearningPreferences.sessionLengthMinutes, subjectProgress: progressBySubject, examDate: SSC_2027_START, tasks: sourceTasks });
    const changed = rescored.filter((task, index) => task.priorityScore !== sourceTasks[index]?.priorityScore || task.reason !== sourceTasks[index]?.reason || task.status !== sourceTasks[index]?.status);
    setTasks(rescored);
    if (changed.length) persist("study_tasks", changed.map(taskRow));
    return rescored;
  };

  const saveProfile = async (patch: Partial<UserProfile>) => {
    if (!profile) return;
    const body = {
      display_name: patch.displayName,
      board: patch.board,
      exam_year: SSC_EXAM_YEAR,
      selected_subjects: patch.selectedSubjects,
      subject_strengths: patch.subjectStrengths,
      most_difficult_subject_id: patch.mostDifficultSubjectId,
      study_group: patch.studyGroup,
      religion_subject_id: patch.religionSubject,
      fourth_subject_id: patch.fourthSubject,
      academic_year: patch.academicYear,
      book_language: patch.bookLanguage,
      academic_profile_completed: patch.academicProfileCompleted,
      onboarding_step: patch.onboardingStep,
      onboarding_completed: patch.onboardingCompleted,
      quick_start_status: patch.quickStartStatus,
    };
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => null) as { profile?: Record<string, unknown>; error?: string } | null;
    if (!response.ok || !payload?.profile) throw new Error(payload?.error ?? "Could not save your profile");
    const row = payload.profile;
    const nextProfile = userProfileFromRow(row);
    setProfile(nextProfile);
    refreshPersonalizedTasks({ nextProfile });
  };

  const updateQuickStartStatus = async (status: QuickStartStatus) => {
    await saveProfile({ quickStartStatus: status });
  };

  const saveCompletedChapters = async (chapterIds: string[]) => {
    const completed = new Set(chapterIds);
    const now = new Date().toISOString();
    const updated = chapterList.map((chapter) => completed.has(chapter.id) ? { ...chapter, status: "exam-ready" as const, confidence: Math.max(4, chapter.confidence) as Chapter["confidence"], lastStudied: chapter.lastStudied ?? now, nextReview: chapter.nextReview ?? new Date(Date.now() + 7 * 86400000).toISOString() } : chapter);
    setChapterList(updated);
    const changed = updated.filter((chapter) => completed.has(chapter.id));
    if (changed.length) persist("chapter_progress", changed.map(chapterRow));
    refreshPersonalizedTasks({ nextChapters: updated });
  };

  const saveExamPlan = async (phases: ExamPlanPhase[]) => {
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam_plan_phases: phases.map(examPlanPhaseRow) }) });
    const payload = await response.json().catch(() => null) as { exam_plan_phases?: BootstrapRow[]; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "Could not save your exam timeline");
    setExamPlan((payload?.exam_plan_phases ?? phases.map(examPlanPhaseRow)).map((row) => ({ id: String(row.id), title: String(row.title), start: String(row.starts_on), end: String(row.ends_on), objective: String(row.objective ?? ""), order: Number(row.phase_order ?? 0) })).sort((a, b) => a.order - b.order));
  };

  const saveAdaptiveProfile = async (patch: Partial<LearningPreferences>, assessments?: SubjectAssessment[]) => {
    if (!profile) return;
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ learning_preferences: learningPreferencesRow(patch), subject_assessments: assessments?.map(subjectAssessmentRow) }) });
    const payload = await response.json().catch(() => null) as { learning_preferences?: Record<string, unknown>; subject_assessments?: Record<string, unknown>[]; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "Could not save your study preferences");
    let nextLearningPreferences = learningPreferences;
    let nextAssessments = subjectAssessments;
    if (payload?.learning_preferences) {
      const row = payload.learning_preferences;
      nextLearningPreferences = learningPreferencesFromRow(row, learningPreferences);
      setLearningPreferences(nextLearningPreferences);
    }
    if (payload?.subject_assessments) {
      nextAssessments = payload.subject_assessments.map((row) => ({ id: String(row.id), userId: String(row.user_id), subjectId: String(row.subject_id), difficulty: Number(row.difficulty) as SubjectAssessment["difficulty"], confidence: Number(row.confidence) as SubjectAssessment["confidence"], priority: Number(row.priority) as SubjectAssessment["priority"], startingPoint: String(row.starting_point) as SubjectAssessment["startingPoint"], preferredMethods: Array.isArray(row.preferred_methods) ? row.preferred_methods.map(String) as SubjectAssessment["preferredMethods"] : [], createdAt: String(row.created_at), updatedAt: String(row.updated_at) }));
      setSubjectAssessments(nextAssessments);
    }
    refreshPersonalizedTasks({ nextAssessments, nextLearningPreferences });
  };

  const saveSubjectPriority = async (subjectId: string, priority: SubjectAssessment["priority"]) => {
    const existing = subjectAssessments.find((assessment) => assessment.subjectId === subjectId);
    const nextAssessment: SubjectAssessment = existing ?? { userId: profile?.userId ?? "", subjectId, difficulty: 3, confidence: 3, priority: 3, startingPoint: "uncertain", preferredMethods: ["textbook", "question-bank"] };
    await saveAdaptiveProfile({}, [...subjectAssessments.filter((assessment) => assessment.subjectId !== subjectId), { ...nextAssessment, priority }]);
  };

  const saveFeedback = (feedback: RecommendationFeedback) => {
    const nextFeedback = [feedback, ...recommendationFeedback];
    setRecommendationFeedback(nextFeedback);
    persist("recommendation_feedback", [feedbackRow(feedback)]);
    refreshPersonalizedTasks({ nextFeedback });
  };

  const saveWorkflowPresets = async (presets: WorkflowPreset[]) => {
    const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ study_workflow_presets: presets.map(workflowPresetRow) }) });
    const payload = await response.json().catch(() => null) as { study_workflow_presets?: Array<Record<string, unknown>>; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error ?? "Could not save your reusable workflow presets");
    const rows: Array<Record<string, unknown>> = payload?.study_workflow_presets ?? presets.map((preset) => workflowPresetRow(preset) as Record<string, unknown>);
    setWorkflowPresets(rows.map((row) => ({ id: String(row.id), name: String(row.name), description: String(row.description ?? ""), phase: String(row.phase) as StudyPhase, subjectType: String(row.subject_type) as WorkflowPreset["subjectType"], steps: Array.isArray(row.steps) ? row.steps.map(String).filter(Boolean) : [], createdAt: row.created_at ? String(row.created_at) : undefined, updatedAt: row.updated_at ? String(row.updated_at) : undefined })));
  };

  const recordFeedback = (task: StudyTask, feedbackType: RecommendationFeedback["feedbackType"]) => saveFeedback({ id: crypto.randomUUID(), userId: learningPreferences.userId, taskId: task.id, subjectId: task.subjectId, chapterId: task.chapterId, feedbackType, method: task.studyMethod, createdAt: new Date().toISOString() });

  const saveSession = (session: StudySession) => {
    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
    persist("study_sessions", [sessionRow(session)]);
  };
  const saveExamSession = (session: ExamSession) => {
    setExamSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
    persist("exam_sessions", [examSessionRow(session)]);
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

  const saveResource = async (resource: StudyResource) => {
    await queueCloudSync("study_resources", [resourceRow(resource)]);
    setResources([resource, ...resources.filter((item) => item.id !== resource.id)]);
  };

  const removeResource = (resource: StudyResource) => {
    const archived = { ...resource, archived: true, updatedAt: new Date().toISOString() };
    setResources(resources.map((item) => item.id === resource.id ? archived : item));
    persist("study_resources", [resourceRow(archived)]);
  };

  const uploadResource = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) throw new Error("Each file must be 25 MB or smaller.");
    const client = createSupabaseClient();
    if (!client) throw new Error("Supabase is not configured for this deployment.");
    const mimeType = file.type || "application/octet-stream";
    const tokenResponse = await fetch("/api/resources/upload-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType }),
    });
    const tokenBody = await tokenResponse.json().catch(() => null) as { storagePath?: string; token?: string; error?: string } | null;
    if (!tokenResponse.ok || !tokenBody?.storagePath || !tokenBody.token) throw new Error(tokenBody?.error ?? "Could not prepare the upload.");
    const { error } = await client.storage.from("study-resources").uploadToSignedUrl(tokenBody.storagePath, tokenBody.token, file, { contentType: mimeType });
    if (error) throw new Error(error.message || "The file could not be uploaded.");
    return { url: `storage://study-resources/${tokenBody.storagePath}`, storagePath: tokenBody.storagePath, fileName: file.name, mimeType, fileSize: file.size };
  };

  const openResource = async (resource: StudyResource) => {
    if (resource.source !== "upload") {
      window.open(resource.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!resource.storagePath) throw new Error("This uploaded resource has no stored file path.");
    const client = createSupabaseClient();
    if (!client) throw new Error("Supabase is not configured for this deployment.");
    const { data, error } = await client.storage.from("study-resources").createSignedUrl(resource.storagePath, 60 * 60);
    if (error || !data?.signedUrl) throw new Error(error?.message || "The uploaded file could not be opened.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const updateTask = (updated: StudyTask) => {
    const next = tasks.map((task) => task.id === updated.id ? updated : task);
    if (updated.pinned) next.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.priorityScore - a.priorityScore);
    setTasks(next);
    persist("study_tasks", [taskRow(updated)]);
  };

  const startFocus = (task: StudyTask) => {
    const now = new Date().toISOString();
    const existing = sessions.find((session) => session.taskId === task.id && session.mode === "focus" && session.timerState !== "completed");
    const session: StudySession = existing ? { ...existing, timerState: "running", lastResumedAt: existing.timerState === "running" && existing.lastResumedAt ? existing.lastResumedAt : now, endedAt: undefined, completed: false } : { id: crypto.randomUUID(), taskId: task.id, subjectId: task.subjectId, chapterId: task.chapterId, mode: "focus", startedAt: now, timerState: "running", lastResumedAt: now, focusedSeconds: task.focusedSeconds ?? 0, pauseSeconds: 0, completed: false };
    setSessions([session, ...sessions.filter((item) => item.id !== session.id)]);
    persist("study_sessions", [sessionRow(session)]);
    updateTask({ ...task, focusedSeconds: session.focusedSeconds, status: "in-progress" });
  };

  const updateFocus = (session: StudySession) => {
    setSessions([session, ...sessions.filter((item) => item.id !== session.id)]);
    persist("study_sessions", [sessionRow(session)]);
    const task = tasks.find((item) => item.id === session.taskId);
    if (task && task.focusedSeconds !== session.focusedSeconds) {
      const updatedTask = { ...task, focusedSeconds: session.focusedSeconds, status: session.focusedSeconds ? "in-progress" as const : task.status };
      setTasks(tasks.map((item) => item.id === task.id ? updatedTask : item));
      persist("study_tasks", [taskRow(updatedTask)]);
    }
  };

  const resetFocus = (task: StudyTask) => {
    const existing = sessions.find((session) => session.taskId === task.id && session.mode === "focus" && session.timerState !== "completed");
    if (existing) {
      const reset = { ...existing, focusedSeconds: 0, timerState: "paused" as const, lastResumedAt: undefined, completed: false, endedAt: undefined };
      setSessions([reset, ...sessions.filter((item) => item.id !== reset.id)]);
      persist("study_sessions", [sessionRow(reset)]);
    }
    updateTask({ ...task, focusedSeconds: 0, status: task.status === "in-progress" ? "planned" : task.status });
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
    navigate("Home");
  };

  const openManual = (date?: string) => { setManualDate(date); setManualOpen(true); };
  const openJournalEntry = () => {
    const firstChapter = chapterList.find((chapter) => !preferenceFor(chapter.id, preferences).excluded) ?? chapterList[0];
    if (!firstChapter) return;
    setJournalTask({ id: "", subjectId: firstChapter.subjectId, chapterId: firstChapter.id, title: firstChapter.title, plannedTime: "", duration: 45, origin: "manual", pinned: true, status: "planned", currentStep: 0, reason: "Manual journal entry", priorityScore: 0, focusedSeconds: 0 });
  };

  const updatePreferences = (updates: ChapterPreference[]) => {
    const updatedIds = new Set(updates.map((item) => item.chapterId));
    const nextPreferences = [...preferences.filter((item) => !updatedIds.has(item.chapterId)), ...updates];
    const updatesByChapter = new Map(updates.map((item) => [item.chapterId, item]));
    const sourceTasks = tasks.map((task) => {
      const preference = updatesByChapter.get(task.chapterId);
      return preference?.excluded && task.status !== "completed" && task.status !== "skipped" ? { ...task, status: "skipped" as const, pinned: false, plannedStart: undefined, plannedEnd: undefined } : task;
    });
    const selectionChanges = sourceTasks.filter((task, index) => task.status !== tasks[index]?.status || task.pinned !== tasks[index]?.pinned);
    setPreferences(nextPreferences);
    persist("chapter_preferences", updates.map(preferenceRow));
    if (selectionChanges.length) persist("study_tasks", selectionChanges.map(taskRow));
    refreshPersonalizedTasks({ sourceTasks, nextPreferences });
  };

  const updatePreference = (updated: ChapterPreference) => updatePreferences([updated]);

  const completeChapter = (chapter: Chapter) => {
    const completedAt = chapter.lastStudied ?? new Date().toISOString();
    const updated: Chapter = { ...chapter, status: "exam-ready", confidence: Math.max(4, chapter.confidence) as Chapter["confidence"], lastStudied: completedAt, nextReview: new Date(Date.now() + 7 * 86400000).toISOString() };
    const nextChapters = chapterList.map((item) => item.id === chapter.id ? updated : item);
    setChapterList(nextChapters);
    persist("chapter_progress", [chapterRow(updated)]);
    refreshPersonalizedTasks({ nextChapters });
  };

  const uncompleteChapter = (chapter: Chapter) => {
    const updated: Chapter = { ...chapter, status: "learning", nextReview: undefined };
    const nextChapters = chapterList.map((item) => item.id === chapter.id ? updated : item);
    setChapterList(nextChapters);
    persist("chapter_progress", [chapterRow(updated)]);
    refreshPersonalizedTasks({ nextChapters });
  };

  const setChapterDifficulty = (chapter: Chapter, difficulty: ChapterDifficulty) => {
    const updated = { ...chapter, difficulty };
    const nextChapters = chapterList.map((item) => item.id === chapter.id ? updated : item);
    setChapterList(nextChapters);
    persist("chapter_progress", [chapterRow(updated)]);
    refreshPersonalizedTasks({ nextChapters });
  };

  const buildGoalQueue = (selected: Chapter[], label: string) => {
    const openChapterIds = new Set(tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").map((task) => task.chapterId));
    const candidates = selected.filter((chapter) => !openChapterIds.has(chapter.id));
    const progressBySubject = subjectProgressMap(chapterList.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded));
    const ranked = recommendTasks(subjects, candidates, { mistakes, mocks, assessments: subjectAssessments, preferences, feedback: recommendationFeedback, mostDifficultSubjectId: profile?.mostDifficultSubjectId, subjectStrengths: profile?.subjectStrengths, targetGrade: learningPreferences.targetGrade, preferredMethods: learningPreferences.preferredMethods, preferredSessionMinutes: learningPreferences.sessionLengthMinutes, subjectProgress: progressBySubject, examDate: SSC_2027_START, tasks }).slice(0, 5);
    const generated = ranked.map((task) => ({
        ...task,
        id: crypto.randomUUID(),
        plannedTime: "Unscheduled",
        plannedStart: undefined,
        plannedEnd: undefined,
        reason: `${label} · ${task.reason}`,
      }));
    if (!generated.length) return;
    const next = [...generated, ...tasks];
    setTasks(next);
    persist("study_tasks", generated.map(taskRow));
    navigate("Calendar");
  };

  const save = (entry: JournalEntry) => {
    const accuracy = entry.attempted ? entry.correct / entry.attempted : 0;
    const completedTask = tasks.find((task) => task.id === entry.taskId);
    const mathematicallyComplete = !isMathematicalSubject(entry.subjectId) || Boolean(completedTask?.workflowStage && completedTask.workflowStageCount && completedTask.workflowStage >= completedTask.workflowStageCount);
    const evidenceStatus: Chapter["status"] = entry.confidenceAfter >= 4 && accuracy >= .8 ? "exam-ready" : accuracy < .6 ? "needs-revision" : "practising";
    const status: Chapter["status"] = evidenceStatus === "exam-ready" && !mathematicallyComplete ? "practising" : evidenceStatus;
    const existingChapter = byChapter(entry.chapterId, chapterList);
    const updatedChapter = { ...existingChapter, status, confidence: Math.max(1, Math.min(5, entry.confidenceAfter)) as Chapter["confidence"], questionsAttempted: existingChapter.questionsAttempted + entry.attempted, questionsCorrect: existingChapter.questionsCorrect + entry.correct, lastStudied: entry.createdAt, nextReview: new Date(Date.now() + (status === "exam-ready" ? 7 : 3) * 86400000).toISOString() };
    const updatedTasks = tasks.map((task) => task.id === entry.taskId ? { ...task, status: "completed" as const } : task);
    const updatedChapters = chapterList.map((chapter) => chapter.id === entry.chapterId ? updatedChapter : chapter);
    const nextMistakes = isMathematicalSubject(entry.subjectId) && entry.mistakesText ? [{ id: crypto.randomUUID(), chapterId: entry.chapterId, prompt: entry.mistakesText, errorType: "Session mistake", reattemptDate: dhakaDateAfter(1), resolved: false, revisionCount: 0 }, ...mistakes] : mistakes;
    const allowedChapters = updatedChapters.filter((chapter) => !preferenceFor(chapter.id, preferences).excluded);
    const recommended = recommendTasks(subjects, allowedChapters, { mistakes: nextMistakes, mocks, assessments: subjectAssessments, preferences, feedback: recommendationFeedback, mostDifficultSubjectId: profile?.mostDifficultSubjectId, subjectStrengths: profile?.subjectStrengths, targetGrade: learningPreferences.targetGrade, preferredMethods: learningPreferences.preferredMethods, preferredSessionMinutes: learningPreferences.sessionLengthMinutes, subjectProgress: subjectProgressMap(allowedChapters), examDate: SSC_2027_START, tasks: updatedTasks }).find((candidate) => !updatedTasks.some((task) => task.status !== "completed" && task.status !== "skipped" && task.chapterId === candidate.chapterId && (!isMathematicalSubject(candidate.subjectId) || (task.workflowGroupId === candidate.workflowGroupId && task.workflowStage === candidate.workflowStage))));
    if (recommended) updatedTasks.push({ ...recommended, plannedTime: "Tomorrow", deferredUntil: new Date(Date.now() + 86400000).toISOString() });
    setEntries([entry, ...entries]);
    setChapterList(updatedChapters);
    persist("journal_entries", [journalRow(entry)]);
    persist("chapter_progress", [chapterRow(updatedChapter)]);
    persist("study_tasks", updatedTasks.filter((task) => task.id === entry.taskId || task.id === recommended?.id).map(taskRow));
    refreshPersonalizedTasks({ sourceTasks: updatedTasks, nextChapters: updatedChapters, nextMistakes });
    if (nextMistakes !== mistakes) {
      const mistake = nextMistakes[0];
      setMistakes(nextMistakes);
      persist("mistakes", [mistakeRow(mistake)]);
    }
    const activeFocus = sessions.find((session) => session.taskId === entry.taskId && session.mode === "focus" && session.timerState !== "completed");
    if (activeFocus) {
      const completedFocus = { ...activeFocus, focusedSeconds: focusElapsedSeconds(activeFocus, new Date(entry.createdAt).getTime()), timerState: "completed" as const, lastResumedAt: undefined, endedAt: entry.createdAt, completed: true, questionsAttempted: entry.attempted, questionsCorrect: entry.correct };
      setSessions([completedFocus, ...sessions.filter((session) => session.id !== completedFocus.id)]);
      persist("study_sessions", [sessionRow(completedFocus)]);
    } else if ((taskById(updatedTasks, entry.taskId)?.focusedSeconds ?? 0) > 0) {
      const focusedSeconds = taskById(updatedTasks, entry.taskId)?.focusedSeconds ?? 0;
      saveSession({ id: crypto.randomUUID(), taskId: entry.taskId, subjectId: entry.subjectId, chapterId: entry.chapterId, mode: "focus", startedAt: new Date(new Date(entry.createdAt).getTime() - focusedSeconds * 1000).toISOString(), endedAt: entry.createdAt, timerState: "completed", focusedSeconds, pauseSeconds: 0, completed: true, questionsAttempted: entry.attempted, questionsCorrect: entry.correct });
    }
    setJournalTask(null);
    navigate("Home");
  };

  const saveMock = (result: MockResult) => {
    const nextMocks = [result, ...mocks];
    setMocks(nextMocks);
    persist("mock_results", [{ id: result.id, subject_id: result.subjectId, paper_type: result.paperType, score: result.score, total: result.total, duration_minutes: result.durationMinutes ?? null, taken_at: result.takenAt }]);
    refreshPersonalizedTasks({ nextMocks });
    setMockOpen(false);
  };

  const recordRevision = (mistake: Mistake, outcome: "solved" | "needs-work", note: string) => {
    const nextCount = (mistake.revisionCount ?? 0) + 1;
    const solved = outcome === "solved";
    const updated = { ...mistake, resolved: solved, revisionCount: nextCount, lastReattemptedAt: new Date().toISOString(), reattemptDate: solved ? "" : new Date(Date.now() + revisionDelayDays(nextCount) * 86400000).toISOString().slice(0, 10), lastAttemptNote: note || mistake.lastAttemptNote };
    const nextMistakes = mistakes.map((item) => item.id === mistake.id ? updated : item);
    setMistakes(nextMistakes);
    persist("mistakes", [mistakeRow(updated)]);
    refreshPersonalizedTasks({ nextMistakes });
    setRevisionMistake(null);
  };

  const startStudy = (task: StudyTask) => {
    setFocusTaskId(task.id);
    navigate("Home");
  };

  const planToday = async (availableMinutes: number, navigateAfter = true) => {
    setPlannerState("running");
    setPlannerMessage("");
    const dayMinutes = dailyCapacityMinutes(learningPreferences);
    try {
      const result = buildAdaptivePlan({ tasks, chapters: chapterList, preferences, mistakes, mocks, subjects, availableMinutes: availableMinutes || dayMinutes, learningPreferences, assessments: subjectAssessments, feedback: recommendationFeedback, mostDifficultSubjectId: profile?.mostDifficultSubjectId, subjectStrengths: profile?.subjectStrengths, selectedSubjectIds: profile?.selectedSubjects, examDate: SSC_2027_START });
      const summary: AdaptivePlanSummary = { usedMinutes: result.usedMinutes, availableMinutes: result.availableMinutes, deferredCount: result.deferredCount, generatedRevisionCount: result.generatedRevisionCount, rationale: result.rationale, plannedAt: new Date().toISOString() };
      setTasks(result.tasks);
      setPlanSummary(summary);
      await Promise.all([
        queueCloudSync("study_tasks", result.tasks.map(taskRow)),
        queueCloudSync("adaptive_plan_summaries", [adaptivePlanRow(summary)]),
      ]);
      setPlannerState("success");
      setPlannerMessage(result.selected.length ? `${result.usedMinutes} minutes arranged across ${result.selected.length} task${result.selected.length === 1 ? "" : "s"}.` : "No task fit this budget. Increase the minutes or add a revision item.");
      if (navigateAfter) navigate("Home");
    } catch (error) {
      setPlannerState("error");
      setPlannerMessage(error instanceof Error ? error.message : "Could not save today’s plan. Try again.");
    }
  };

  const runAutomaticPlan = useEffectEvent((minutes: number) => {
    void planToday(minutes, false);
  });
  useEffect(() => {
    const today = dhakaDateKey();
    if (databaseStatus !== "ready" || !profile?.onboardingCompleted || !profile.academicProfileCompleted || isCurrentDailyPlan(planSummary) || autoPlanDateRef.current === today) return;
    autoPlanDateRef.current = today;
    runAutomaticPlan(dailyCapacityMinutes(learningPreferences));
  }, [databaseStatus, learningPreferences, planSummary, profile]);

  if (databaseStatus !== "ready") return <DatabaseGate status={databaseStatus} error={databaseError} />;
  if (!profile) return <DatabaseGate status="loading" error="Preparing your private workspace…" />;
  if (!profile.onboardingCompleted || !profile.academicProfileCompleted) return <OnboardingWizard profile={profile} subjects={subjects} chapters={chapterList} learningPreferences={learningPreferences} subjectAssessments={subjectAssessments} save={saveProfile} saveAdaptive={saveAdaptiveProfile} saveCompletedChapters={saveCompletedChapters} examPlan={examPlan} saveExamPlan={saveExamPlan} />;
  const home = <Home tasks={tasks} chapters={chapterList} preferences={preferences} mistakes={mistakes} entries={entries} examEvents={examEvents} learningPreferences={learningPreferences} update={updateTask} remove={removeTaskFromToday} journal={setJournalTask} add={() => openManual()} focusTaskId={focusTaskId} planSummary={planSummary} planToday={planToday} plannerState={plannerState} plannerMessage={plannerMessage} sessions={sessions} startFocus={startFocus} updateFocus={updateFocus} resetFocus={resetFocus} go={navigate} startStudy={startStudy} feedback={recordFeedback} goJournal={() => navigate("Journal")} workflows={studyWorkflows} workflowPresets={workflowPresets} preferredMethods={learningPreferences.preferredMethods} quickStartStatus={profile.quickStartStatus ?? "active"} onQuickStartStatusChange={updateQuickStartStatus} />;
  const content = (() => {
    switch (active) {
      case "Home":
      case "Dashboard":
      case "Today": return home;
      case "Syllabus": return <Syllabus list={chapterList} setList={setChapterList} preferences={preferences} updatePreference={updatePreference} completeChapter={completeChapter} uncompleteChapter={uncompleteChapter} persistProgress={(chapter) => persist("chapter_progress", [chapterRow(chapter)])} saveCompletedChapters={saveCompletedChapters} goGoals={() => navigate("Goals")} sessions={sessions} entries={entries} mistakes={mistakes} resources={resources} subjectStrengths={profile.subjectStrengths} subjectAssessments={subjectAssessments} saveSubjectPriority={saveSubjectPriority} goResources={(chapterId) => { setResourceChapterId(chapterId); navigate("Resources"); }} />;
      case "Goals": return <Goals list={chapterList} preferences={preferences} updatePreference={updatePreference} updatePreferences={updatePreferences} completeChapter={completeChapter} uncompleteChapter={uncompleteChapter} setDifficulty={setChapterDifficulty} buildQueue={buildGoalQueue} />;
      case "Calendar": return <StudyCalendar tasks={tasks} preferences={preferences} update={updateTask} add={openManual} openTask={(task) => { setFocusTaskId(task.id); navigate("Home"); }} />;
      case "Journal": return <Journal entries={entries} add={() => openJournalEntry()} />;
      case "Progress": return <Progress entries={entries} list={chapterList} mocks={mocks} addMock={() => setMockOpen(true)} sessions={sessions} tasks={tasks} />;
      case "Exam Mode": return <ExamModeFocus chapters={chapterList} sessions={examSessions} onClose={() => navigate("Home")} onSaveSession={saveExamSession} />;
      case "Resources": return <ResourceLibrary resources={resources.filter((resource) => !resource.archived)} curatedTextbooks={curatedTextbooks} chapters={chapterList} initialChapterId={resourceChapterId} preferredKinds={learningPreferences.preferredResourceKinds} save={saveResource} remove={removeResource} upload={uploadResource} open={openResource} />;
      case "Countdown": return <ExamCountdownCenter events={examEvents} saveEvents={saveExamEvents} chapters={chapterList} tasks={tasks} entries={entries} goToday={() => navigate("Home")} />;
      case "Exam Plan": return <ExamPlan plan={examPlan} save={saveExamPlan} />;
      case "Support": return <SupportPage />;
      default: return <Settings planning={planning} setPlanning={updatePlanning} profile={profile} saveProfile={saveProfile} learningPreferences={learningPreferences} saveAdaptive={saveAdaptiveProfile} workflowPresets={workflowPresets} saveWorkflowPresets={saveWorkflowPresets} onSignOut={signOut} />;
    }
  })();

  return <div className="app-shell">
    <button className="skip-link" onClick={() => document.querySelector("main")?.focus()}>Skip to main content</button>
    <Sidebar active={active} setActive={navigate} open={menu} close={() => setMenu(false)} />
    {menu && <button className="mobile-scrim" onClick={() => setMenu(false)} aria-label="Close navigation" />}
    <div className="workspace"><Topbar active={active} open={() => setMenu(true)} expanded={menu} profile={profile} /><div className="page-transition" key={active}>{content}</div></div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{mobilePrimaryNav.map(([label, Icon]) => <button key={label} aria-label={label} aria-current={active === label ? "page" : undefined} className={active === label ? "active" : ""} onClick={() => navigate(label)}><Icon size={20} weight={active === label ? "fill" : "regular"} /><span>{label}</span></button>)}<button aria-label="More sections" aria-expanded={mobileMoreOpen} className={mobileMoreOpen ? "active" : ""} onClick={() => setMobileMoreOpen((open) => !open)}><Rows size={20} weight="bold" /><span>More</span></button></nav>
    {mobileMoreOpen && <><button className="mobile-more-scrim" onClick={() => setMobileMoreOpen(false)} aria-label="Close more sections" /><section className="mobile-more-menu" aria-label="More sections">{nav.filter(([label]) => !mobilePrimaryNav.some(([primary]) => primary === label)).map(([label, Icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => navigate(label)}><Icon size={18} weight={active === label ? "fill" : "regular"} /><span><strong>{label}</strong><small>Open section</small></span></button>)}</section></>}
    {manualOpen && <ManualTaskModal close={() => { setManualOpen(false); setManualDate(undefined); }} save={addTask} configurePresets={() => { setManualOpen(false); setManualDate(undefined); router.push("/settings#study-workflows"); }} defaultDate={manualDate} preferences={preferences} workflowPresets={workflowPresets} preferredMethods={learningPreferences.preferredMethods} />}
    {journalTask && <JournalModal task={journalTask} close={() => setJournalTask(null)} save={save} />}
    {mockOpen && <MockResultModal close={() => setMockOpen(false)} save={saveMock} />}
    {revisionMistake && <RevisionModal mistake={revisionMistake} close={() => setRevisionMistake(null)} save={(outcome, note) => recordRevision(revisionMistake, outcome, note)} />}
    <p className="sr-only" aria-live="polite">{manualOpen ? "Add task dialog opened" : journalTask ? "Session journal opened" : mockOpen ? "Mock result dialog opened" : revisionMistake ? "Revision attempt dialog opened" : ""}</p>
  </div>;
}
