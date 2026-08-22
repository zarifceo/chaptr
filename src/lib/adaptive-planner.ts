import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Chapter, ChapterPreference, Mistake, MockResult, PlanningSettings, StudyTask, Subject, LearningPreferences, SubjectAssessment, RecommendationFeedback, StrengthLevel } from "./types";
import { recommendTasks } from "./recommendations";
import { isMathematicalSubject } from "./study-workflows";
import { isBangladeshWeekend } from "./week-schedule";

type AdaptivePlanInput = {
  tasks: StudyTask[];
  chapters: Chapter[];
  preferences: ChapterPreference[];
  mistakes: Mistake[];
  mocks: MockResult[];
  subjects: Subject[];
  settings: PlanningSettings;
  availableMinutes: number;
  learningPreferences?: LearningPreferences;
  assessments?: SubjectAssessment[];
  feedback?: RecommendationFeedback[];
  mostDifficultSubjectId?: string;
  subjectStrengths?: Record<string, StrengthLevel>;
  now?: Date;
};

type PlanCandidate = {
  task: StudyTask;
  score: number;
  rationale: string;
  source: "existing" | "revision" | "recommendation";
};

export type AdaptivePlanResult = {
  tasks: StudyTask[];
  selected: StudyTask[];
  usedMinutes: number;
  availableMinutes: number;
  deferredCount: number;
  rationale: string[];
  generatedRevisionCount: number;
};

function dhakaDateKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 15) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function toTimeLabel(totalMinutes: number) {
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function isoAt(dateKey: string, totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+06:00`).toISOString();
}

function chapterMap(chapters: Chapter[]) {
  return new Map(chapters.map((chapter) => [chapter.id, chapter]));
}

function preferenceMap(preferences: ChapterPreference[]) {
  return new Map(preferences.map((preference) => [preference.chapterId, preference]));
}

function isOpenTask(task: StudyTask, now: Date) {
  return (task.status === "planned" || task.status === "in-progress") && (!task.deferredUntil || parseISO(task.deferredUntil).getTime() <= now.getTime());
}

export function revisionDelayDays(attempts: number) {
  if (attempts <= 0) return 1;
  if (attempts === 1) return 2;
  if (attempts === 2) return 4;
  return 7;
}

function priorityBonus(priority?: number) {
  return Math.max(0, ((priority ?? 3) - 1) * 4);
}

function protectedSubjectBonus(subjectId: string, mostDifficultSubjectId?: string, subjectStrengths?: Record<string, StrengthLevel>) {
  const selfRatingBonus = subjectStrengths?.[subjectId] === "toughest" ? 9 : subjectStrengths?.[subjectId] === "moderate" ? 5 : subjectStrengths?.[subjectId] === "very-strong" ? 2 : 0;
  return mostDifficultSubjectId === subjectId ? 14 + selfRatingBonus : selfRatingBonus;
}

function scheduleTask(task: StudyTask, dateKey: string, startMinutes: number, rationale: string) {
  const plannedStart = isoAt(dateKey, startMinutes);
  const plannedEnd = new Date(new Date(plannedStart).getTime() + task.duration * 60000).toISOString();
  return { ...task, plannedTime: toTimeLabel(startMinutes), plannedStart, plannedEnd, deferredUntil: undefined, reason: rationale };
}

export function buildAdaptivePlan(input: AdaptivePlanInput): AdaptivePlanResult {
  const now = input.now ?? new Date();
  const dateKey = dhakaDateKey(now);
  const tomorrowKey = format(addDays(new Date(`${dateKey}T00:00:00+06:00`), 1), "yyyy-MM-dd");
  const profileBudget = input.learningPreferences ? (isBangladeshWeekend(now.getDay()) ? input.learningPreferences.weekendMinutes : input.learningPreferences.weekdayMinutes) : input.availableMinutes;
  const budget = Math.max(15, Math.min(600, Math.round(input.availableMinutes || profileBudget)));
  const chapters = chapterMap(input.chapters);
  const preferences = preferenceMap(input.preferences);
  const assessmentsBySubject = new Map((input.assessments ?? []).map((assessment) => [assessment.subjectId, assessment]));
  const excluded = new Set(input.preferences.filter((preference) => preference.excluded).map((preference) => preference.chapterId));
  const openTasks = input.tasks.filter((task) => !excluded.has(task.chapterId) && isOpenTask(task, now));
  const openChapterIds = new Set(openTasks.map((task) => task.chapterId));
  const candidates: PlanCandidate[] = [];
  const rationale: string[] = [];

  for (const task of openTasks) {
    const chapter = chapters.get(task.chapterId);
    const subject = input.subjects.find((item) => item.id === task.subjectId);
    if (!chapter || !subject) continue;
    const bonus = protectedSubjectBonus(task.subjectId, input.mostDifficultSubjectId, input.subjectStrengths) + priorityBonus(assessmentsBySubject.get(task.subjectId)?.priority);
    candidates.push({ task, score: task.priorityScore + (task.pinned ? 70 : 0) + bonus, rationale: task.pinned ? "Pinned unfinished work" : `Continue unfinished ${subject.shortName} work`, source: "existing" });
  }

  const revisionIds = new Set<string>();
  for (const mistake of input.mistakes.filter((item) => !item.resolved)) {
    const chapter = chapters.get(mistake.chapterId);
    const subject = chapter && input.subjects.find((item) => item.id === chapter.subjectId);
    if (!chapter || !subject || excluded.has(chapter.id)) continue;
    const due = !mistake.reattemptDate || mistake.reattemptDate <= dateKey;
    const existingRevision = openTasks.some((task) => task.id.startsWith(`revision-${mistake.id}-`));
    if (!due || existingRevision) continue;
    const overdueDays = mistake.reattemptDate ? Math.max(0, differenceInCalendarDays(new Date(`${dateKey}T00:00:00+06:00`), parseISO(mistake.reattemptDate))) : 0;
    const revisionTask: StudyTask = {
      id: `revision-${mistake.id}-${dateKey}`,
      subjectId: subject.id,
      chapterId: chapter.id,
      title: `Reattempt: ${mistake.prompt}`,
      plannedTime: "Unscheduled",
      duration: isMathematicalSubject(subject.id) ? 30 : 25,
      origin: "recommended",
      pinned: true,
      status: "planned",
      currentStep: 0,
      workflowPhase: "revise",
      reason: `Revision due · ${mistake.errorType}`,
      priorityScore: 135 + overdueDays * 8 + (mistake.revisionCount ?? 0) * 4,
      focusedSeconds: 0,
    };
    revisionIds.add(mistake.id);
    candidates.push({ task: revisionTask, score: revisionTask.priorityScore, rationale: `Repair ${subject.shortName}: ${mistake.errorType}`, source: "revision" });
  }

  const recommendations = recommendTasks(input.subjects, input.chapters.filter((chapter) => !excluded.has(chapter.id)), { mistakes: input.mistakes, mocks: input.mocks, assessments: input.assessments, feedback: input.feedback, mostDifficultSubjectId: input.mostDifficultSubjectId, subjectStrengths: input.subjectStrengths, preferredMethods: input.learningPreferences?.preferredMethods, tasks: input.tasks });
  for (const task of recommendations) {
    const chapter = chapters.get(task.chapterId);
    const subject = input.subjects.find((item) => item.id === task.subjectId);
    if (!chapter || !subject || openChapterIds.has(task.chapterId) || (chapter.status === "exam-ready" && !task.workflowStage)) continue;
    const preference = preferences.get(chapter.id);
    const assessment = input.assessments?.find((item) => item.subjectId === task.subjectId);
    const methodBonus = input.learningPreferences?.preferredMethods.includes(task.studyMethod ?? "textbook") ? 8 : 0;
    const score = task.priorityScore + protectedSubjectBonus(task.subjectId, input.mostDifficultSubjectId, input.subjectStrengths) + (preference?.priority ?? 3) * 3 + (assessment?.priority ?? 3) * 2 + methodBonus;
    candidates.push({       task: { ...task, id: `adaptive-${task.chapterId}-${dateKey}` }, score, rationale: `Adaptive recommendation · ${task.reason}`, source: "recommendation" });
  }

  const deduped = [...new Map(candidates.map((candidate) => [candidate.task.chapterId + ":" + candidate.source + ":" + (candidate.task.workflowStage ?? candidate.task.id), candidate])).values()]
    .sort((a, b) => b.score - a.score || Number(Boolean(b.task.pinned)) - Number(Boolean(a.task.pinned)));
  const selectedCandidates: PlanCandidate[] = [];
  let remaining = budget;
  for (const candidate of deduped) {
    if (candidate.task.duration <= remaining || (selectedCandidates.length === 0 && candidate.source === "revision")) {
      selectedCandidates.push(candidate);
      remaining -= candidate.task.duration;
    }
    if (remaining <= 0) break;
  }

  const configuredWindows = input.settings.studyWindows
    .map((window) => ({ ...window, startMinutes: timeToMinutes(window.start), endMinutes: timeToMinutes(window.end) }))
    .filter((window) => window.endMinutes > window.startMinutes);
  const windows = configuredWindows.length ? configuredWindows : [{ id: "window-1", startMinutes: 9 * 60, endMinutes: 12 * 60 }];
  const cursors = windows.map((window) => window.startMinutes);
  const selected: StudyTask[] = [];
  for (const candidate of selectedCandidates) {
    let scheduled = false;
    for (let index = 0; index < windows.length; index += 1) {
      const window = windows[index];
      const cursor = cursors[index];
      if (cursor + candidate.task.duration > window.endMinutes) continue;
      selected.push(scheduleTask(candidate.task, dateKey, cursor, candidate.rationale));
      cursors[index] = cursor + candidate.task.duration + 10;
      scheduled = true;
      break;
    }
    if (!scheduled) rationale.push(`${candidate.task.title} was deferred because it would exceed the configured study windows.`);
  }
  const selectedIds = new Set(selected.map((task) => task.id));
  const activeIds = new Set(openTasks.map((task) => task.id));
  const updatedTasks = input.tasks.map((task) => {
    if (selectedIds.has(task.id)) return selected.find((item) => item.id === task.id)!;
    if (activeIds.has(task.id) && !task.pinned) return { ...task, plannedTime: "Tomorrow", plannedStart: undefined, plannedEnd: undefined, deferredUntil: new Date(`${tomorrowKey}T00:00:00+06:00`).toISOString() };
    return task;
  });
  const generated = selected.filter((task) => !input.tasks.some((existing) => existing.id === task.id));
  const allTasks = [...generated, ...updatedTasks];
  const deferredCount = input.tasks.filter((task) => activeIds.has(task.id) && !selectedIds.has(task.id) && !task.pinned).length;
  if (revisionIds.size) rationale.push(`${revisionIds.size} due revision${revisionIds.size === 1 ? "" : "s"} placed first.`);
  if (deferredCount) rationale.push(`${deferredCount} lower-priority task${deferredCount === 1 ? " was" : "s were"} moved to tomorrow.`);
  if (!selected.length) rationale.push("No task fit the current time budget; increase available minutes or add a revision item.");

  return { tasks: allTasks, selected, usedMinutes: selected.reduce((sum, task) => sum + task.duration, 0), availableMinutes: budget, deferredCount, rationale, generatedRevisionCount: generated.filter((task) => task.id.startsWith("revision-")).length };
}
