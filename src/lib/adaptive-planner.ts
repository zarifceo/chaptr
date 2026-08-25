import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Chapter, ChapterPreference, Mistake, MockResult, StudyTask, Subject, LearningPreferences, SubjectAssessment, RecommendationFeedback, StrengthLevel } from "./types";
import { recommendTasks, scoreChapter } from "./recommendations";
import { isMathematicalSubject } from "./study-workflows";
import { dailyCapacityMinutes } from "./daily-capacity";

type AdaptivePlanInput = {
  tasks: StudyTask[];
  chapters: Chapter[];
  preferences: ChapterPreference[];
  mistakes: Mistake[];
  mocks: MockResult[];
  subjects: Subject[];
  availableMinutes?: number;
  learningPreferences?: LearningPreferences;
  assessments?: SubjectAssessment[];
  feedback?: RecommendationFeedback[];
  mostDifficultSubjectId?: string;
  subjectStrengths?: Record<string, StrengthLevel>;
  selectedSubjectIds?: string[];
  examDate?: string;
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

function chapterMap(chapters: Chapter[]) {
  return new Map(chapters.map((chapter) => [chapter.id, chapter]));
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

function scheduleTask(task: StudyTask, dateKey: string, index: number, rationale: string) {
  return {
    ...task,
    plannedTime: index === 0 ? "Do now" : "Today",
    plannedStart: new Date(`${dateKey}T00:00:00+06:00`).toISOString(),
    plannedEnd: undefined,
    deferredUntil: undefined,
    reason: rationale,
  };
}

function workflowRatioBonus(task: StudyTask, preferences?: LearningPreferences) {
  if (!preferences) return 0;
  if (task.workflowPhase === "revise") return preferences.reviewRatio * 0.25;
  if (task.workflowPhase === "practice" || task.workflowPhase === "exam") return preferences.practiceRatio * 0.25;
  return preferences.instructionRatio * 0.25;
}

const statusProgress: Record<Chapter["status"], number> = {
  "not-started": 0,
  learning: 30,
  practising: 60,
  "needs-revision": 42,
  "exam-ready": 100,
};

export function subjectProgressMap(chapters: Chapter[]) {
  const grouped = new Map<string, { total: number; count: number }>();
  for (const chapter of chapters) {
    const progress = statusProgress[chapter.status] * 0.8 + (chapter.confidence / 5) * 20;
    const current = grouped.get(chapter.subjectId) ?? { total: 0, count: 0 };
    grouped.set(chapter.subjectId, { total: current.total + progress, count: current.count + 1 });
  }
  return Object.fromEntries([...grouped].map(([subjectId, value]) => [subjectId, Math.round(value.total / Math.max(1, value.count))]));
}

function diversifyCandidates(candidates: PlanCandidate[], scoreWindow = 12) {
  const remaining = [...candidates];
  const ordered: PlanCandidate[] = [];
  let interleaved = 0;
  while (remaining.length) {
    let selectedIndex = 0;
    const last = ordered.at(-1);
    const previous = ordered.at(-2);
    const top = remaining[0];
    if (last && previous && last.task.subjectId === previous.task.subjectId && top.task.subjectId === last.task.subjectId && top.source !== "revision" && !top.task.pinned) {
      const alternativeIndex = remaining.findIndex((candidate) => candidate.task.subjectId !== top.task.subjectId && candidate.source !== "revision" && !candidate.task.pinned && top.score - candidate.score <= scoreWindow);
      if (alternativeIndex > 0) {
        selectedIndex = alternativeIndex;
        interleaved += 1;
      }
    }
    ordered.push(remaining.splice(selectedIndex, 1)[0]);
  }
  return { ordered, interleaved };
}

export function buildAdaptivePlan(input: AdaptivePlanInput): AdaptivePlanResult {
  const now = input.now ?? new Date();
  const dateKey = dhakaDateKey(now);
  const tomorrowKey = dhakaDateKey(new Date(now.getTime() + 86400000));
  const profileBudget = input.learningPreferences ? dailyCapacityMinutes(input.learningPreferences, now) : 120;
  const budget = Math.max(15, Math.min(720, Math.round(input.availableMinutes ?? profileBudget)));
  const selectedSubjects = new Set(input.selectedSubjectIds?.length ? input.selectedSubjectIds : input.subjects.map((subject) => subject.id));
  const eligibleChapters = input.chapters.filter((chapter) => selectedSubjects.has(chapter.subjectId));
  const chapters = chapterMap(eligibleChapters);
  const excluded = new Set(input.preferences.filter((preference) => preference.excluded).map((preference) => preference.chapterId));
  const trackableChapters = eligibleChapters.filter((chapter) => !excluded.has(chapter.id));
  const progressBySubject = subjectProgressMap(trackableChapters);
  const scoringEvidence = { mistakes: input.mistakes, mocks: input.mocks, assessments: input.assessments, preferences: input.preferences, feedback: input.feedback, mostDifficultSubjectId: input.mostDifficultSubjectId, subjectStrengths: input.subjectStrengths, preferredMethods: input.learningPreferences?.preferredMethods, preferredSessionMinutes: input.learningPreferences?.sessionLengthMinutes, subjectProgress: progressBySubject, examDate: input.examDate, targetGrade: input.learningPreferences?.targetGrade, tasks: input.tasks, now };
  const staleCompletedTaskIds = new Set(input.tasks.filter((task) => isOpenTask(task, now) && chapters.get(task.chapterId)?.status === "exam-ready" && task.workflowPhase !== "revise").map((task) => task.id));
  const openTasks = input.tasks.filter((task) => selectedSubjects.has(task.subjectId) && !excluded.has(task.chapterId) && !staleCompletedTaskIds.has(task.id) && isOpenTask(task, now));
  const openChapterIds = new Set(openTasks.map((task) => task.chapterId));
  const candidates: PlanCandidate[] = [];
  const rationale: string[] = [];

  for (const task of openTasks) {
    const chapter = chapters.get(task.chapterId);
    const subject = input.subjects.find((item) => item.id === task.subjectId);
    if (!chapter || !subject) continue;
    const scored = scoreChapter(subject, chapter, now, scoringEvidence);
    const rescoredTask = { ...task, priorityScore: scored.score, reason: `${task.pinned ? "Pinned by you" : "Continue unfinished work"} · ${scored.explanation}`, recommendationFactors: scored.factors };
    candidates.push({ task: rescoredTask, score: scored.score + (task.pinned ? 70 : 0) + workflowRatioBonus(task, input.learningPreferences), rationale: rescoredTask.reason, source: "existing" });
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
    candidates.push({ task: revisionTask, score: revisionTask.priorityScore + workflowRatioBonus(revisionTask, input.learningPreferences), rationale: `Repair ${subject.shortName}: ${mistake.errorType}`, source: "revision" });
  }

  const recommendations = recommendTasks(input.subjects.filter((subject) => selectedSubjects.has(subject.id)), trackableChapters, scoringEvidence);
  for (const task of recommendations) {
    const chapter = chapters.get(task.chapterId);
    const subject = input.subjects.find((item) => item.id === task.subjectId);
    if (!chapter || !subject || openChapterIds.has(task.chapterId)) continue;
    const methodBonus = input.learningPreferences?.preferredMethods.includes(task.studyMethod ?? "textbook") ? 8 : 0;
    const score = task.priorityScore + methodBonus + workflowRatioBonus(task, input.learningPreferences);
    candidates.push({ task: { ...task, id: `adaptive-${task.chapterId}-${dateKey}` }, score, rationale: task.reason, source: "recommendation" });
  }

  const deduped = [...new Map(candidates.map((candidate) => [candidate.task.chapterId + ":" + candidate.source + ":" + (candidate.task.workflowStage ?? candidate.task.id), candidate])).values()]
    .sort((a, b) => b.score - a.score || Number(Boolean(b.task.pinned)) - Number(Boolean(a.task.pinned)));
  const diversified = diversifyCandidates(deduped);
  const selectedCandidates: PlanCandidate[] = [];
  let remaining = budget;
  const minimumUsefulSlice = input.learningPreferences?.planStrictness === "strict" ? 10 : input.learningPreferences?.planStrictness === "flexible" ? 20 : 15;
  for (const candidate of diversified.ordered) {
    if (candidate.task.duration <= remaining) {
      selectedCandidates.push(candidate);
      remaining -= candidate.task.duration;
    } else if (remaining >= minimumUsefulSlice) {
      selectedCandidates.push({ ...candidate, task: { ...candidate.task, duration: remaining } });
      remaining = 0;
    }
    if (remaining <= 0) break;
  }

  const selected = selectedCandidates.map((candidate, index) => scheduleTask(candidate.task, dateKey, index, candidate.rationale));
  const selectedIds = new Set(selected.map((task) => task.id));
  const activeIds = new Set(openTasks.map((task) => task.id));
  const updatedTasks = input.tasks.map((task) => {
    if (staleCompletedTaskIds.has(task.id)) return { ...task, status: "skipped" as const, plannedStart: undefined, plannedEnd: undefined };
    if (selectedIds.has(task.id)) return selected.find((item) => item.id === task.id)!;
    if (activeIds.has(task.id)) return { ...task, plannedTime: "Tomorrow", plannedStart: undefined, plannedEnd: undefined, deferredUntil: new Date(`${tomorrowKey}T00:00:00+06:00`).toISOString() };
    return task;
  });
  const generated = selected.filter((task) => !input.tasks.some((existing) => existing.id === task.id));
  const allTasks = [...generated, ...updatedTasks];
  const deferredCount = input.tasks.filter((task) => activeIds.has(task.id) && !selectedIds.has(task.id)).length;
  if (revisionIds.size) rationale.push(`${revisionIds.size} due revision${revisionIds.size === 1 ? "" : "s"} placed first.`);
  const lowestProgress = Object.entries(progressBySubject).sort(([, a], [, b]) => a - b)[0];
  if (lowestProgress) {
    const subject = input.subjects.find((item) => item.id === lowestProgress[0]);
    if (subject) rationale.push(`${subject.shortName} receives extra weight because it has the lowest current progress (${lowestProgress[1]}%).`);
  }
  if (diversified.interleaved) rationale.push("Close-score tasks were balanced across subjects so one weak subject does not consume the whole day.");
  rationale.push(`The plan is capped at ${budget} minutes and uses ${input.learningPreferences?.sessionLengthMinutes ?? 45}-minute focus blocks where possible.`);
  if (deferredCount) rationale.push(`${deferredCount} lower-priority task${deferredCount === 1 ? " was" : "s were"} moved to tomorrow.`);
  if (!selected.length) rationale.push("No task fit the current time budget; increase available minutes or add a revision item.");

  const guidance = input.learningPreferences?.guidanceMode ?? "guided";
  const visibleRationale = guidance === "quiet" ? rationale.filter((line) => line.startsWith("The plan is capped")) : guidance === "balanced" ? rationale.slice(0, 2) : rationale;

  return { tasks: allTasks, selected, usedMinutes: selected.reduce((sum, task) => sum + task.duration, 0), availableMinutes: budget, deferredCount, rationale: visibleRationale, generatedRevisionCount: generated.filter((task) => task.id.startsWith("revision-")).length };
}
