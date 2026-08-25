import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Chapter, ChapterPreference, Mistake, MockResult, RecommendationFeedback, StudyTask, Subject, SubjectAssessment, LearningMethod, StrengthLevel } from "./types";
import { isMathematicalSubject, mathematicalStages } from "./study-workflows";

const baseMasteryGap = { "not-started": 100, learning: 72, practising: 42, "needs-revision": 78, "exam-ready": 8 } as const;

function masteryGap(status: Chapter["status"], targetGrade?: string) {
  const base = baseMasteryGap[status];
  if (targetGrade === "A+") return status === "exam-ready" ? 18 : Math.min(100, base + 8);
  if (targetGrade === "Pass safely") return status === "not-started" ? 100 : Math.max(0, base - 12);
  return base;
}

type RecommendationEvidence = {
  mistakes?: Mistake[];
  mocks?: MockResult[];
  assessments?: SubjectAssessment[];
  preferences?: ChapterPreference[];
  feedback?: RecommendationFeedback[];
  mostDifficultSubjectId?: string;
  subjectStrengths?: Record<string, StrengthLevel>;
  examDate?: string;
  targetGrade?: string;
  preferredMethods?: LearningMethod[];
  preferredSessionMinutes?: number;
  subjectProgress?: Record<string, number>;
  tasks?: StudyTask[];
  now?: Date;
};

const methodLabels: Record<LearningMethod, string> = {
  "online-class": "online class",
  textbook: "textbook reading",
  guidebook: "guidebook practice",
  "question-bank": "question-bank practice",
  video: "video lesson",
  notes: "notes and recall",
  tutor: "tutor-led study",
  "group-study": "group study",
  flashcards: "flashcard recall",
};

function assessmentFor(subjectId: string, assessments: SubjectAssessment[] = []) {
  return assessments.find((assessment) => assessment.subjectId === subjectId);
}

function preferenceFor(chapterId: string, preferences: ChapterPreference[] = []) {
  return preferences.find((preference) => preference.chapterId === chapterId);
}

function feedbackAdjustment(subjectId: string, feedback: RecommendationFeedback[] = []) {
  const recent = feedback.filter((item) => item.subjectId === subjectId).slice(0, 8);
  return recent.reduce((total, item) => total + (item.feedbackType === "too-hard" ? 7 : item.feedbackType === "useful" ? 3 : item.feedbackType === "too-easy" ? -5 : item.feedbackType === "not-useful" ? -3 : -1), 0);
}

function preferredMethod(assessment?: SubjectAssessment, preferredMethods: LearningMethod[] = []) {
  return assessment?.preferredMethods?.[0] ?? preferredMethods[0] ?? "textbook";
}

function workflowPhaseFor(chapter: Chapter): "learn" | "revise" | "practice" {
  if (chapter.status === "needs-revision") return "revise";
  if (chapter.status === "practising") return "practice";
  return "learn";
}

export function scoreChapter(subject: Subject, chapter: Chapter, now = new Date(), evidence: RecommendationEvidence = {}) {
  const examDate = evidence.examDate ?? `${now.getFullYear()}-10-28`;
  const daysToTest = Math.max(1, differenceInCalendarDays(parseISO(examDate), now));
  const urgency = Math.min(100, 7000 / daysToTest);
  const review = chapter.nextReview && parseISO(chapter.nextReview) <= now ? 100 : chapter.lastStudied ? 45 : 80;
  const accuracyGap = chapter.questionsAttempted ? (1 - chapter.questionsCorrect / chapter.questionsAttempted) * 100 : 55;
  const latestMock = evidence.mocks?.filter((mock) => mock.subjectId === subject.id).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  const mockGap = latestMock?.total ? (1 - latestMock.score / latestMock.total) * 100 : 0;
  const hasOpenMistake = evidence.mistakes?.some((mistake) => mistake.chapterId === chapter.id && !mistake.resolved);
  const assessment = assessmentFor(subject.id, evidence.assessments);
  const chapterPreference = preferenceFor(chapter.id, evidence.preferences);
  const strength = evidence.subjectStrengths?.[subject.id];
  const personalDifficulty = strength ? ({ strongest: 20, "very-strong": 40, moderate: 60, toughest: 100 }[strength]) : (assessment?.difficulty ?? 3) * 20;
  const chapterDifficulty = chapter.difficulty * 20;
  const personalSubjectSignal = evidence.mostDifficultSubjectId === subject.id ? 15 : 0;
  const difficulty = Math.min(100, Math.round((personalDifficulty + chapterDifficulty) / 2) + personalSubjectSignal);
  const subjectPriority = (assessment?.priority ?? 3) * 20;
  const chapterPriority = (chapterPreference?.priority ?? 3) * 20;
  const priority = Math.round(subjectPriority * .6 + chapterPriority * .4);
  const recentEvidence = Math.max(accuracyGap, mockGap, hasOpenMistake ? 100 : 0);
  const subjectProgress = Math.max(0, Math.min(100, evidence.subjectProgress?.[subject.id] ?? 0));
  const subjectProgressGap = 100 - subjectProgress;
  const adjustment = feedbackAdjustment(subject.id, evidence.feedback);
  const mastery = masteryGap(chapter.status, evidence.targetGrade);
  const score = urgency * .10 + difficulty * .20 + priority * .16 + mastery * .20 + subjectProgressGap * .18 + review * .08 + recentEvidence * .08 + adjustment;
  const method = preferredMethod(assessment, evidence.preferredMethods);
  const reasons = [
    hasOpenMistake ? "open mistake needs repair" : review >= 80 && chapter.lastStudied ? "review is due" : null,
    subjectProgress < 70 ? `${subject.shortName} is ${Math.round(subjectProgress)}% progressed` : null,
    chapterPreference?.priority && chapterPreference.priority >= 4 ? `chapter priority ${chapterPreference.priority}/5` : assessment?.priority && assessment.priority >= 4 ? `subject priority ${assessment.priority}/5` : null,
    evidence.mostDifficultSubjectId === subject.id ? "your selected difficult subject" : strength === "toughest" ? "you rated this subject toughest" : chapter.difficulty >= 4 ? `chapter difficulty ${chapter.difficulty}/5` : null,
    chapter.status === "not-started" ? "not started yet" : evidence.targetGrade === "A+" ? "below your A+ mastery target" : "mastery still needs work",
    latestMock ? "mock result shows a gap" : accuracyGap > 60 ? "recent accuracy needs work" : null,
    `fits ${methodLabels[method]}`,
  ].filter((reason): reason is string => Boolean(reason)).slice(0, 3);
  return {
    score: Math.max(0, Math.round(score)),
    explanation: reasons.join(" · "),
    factors: { urgency: Math.round(urgency), difficulty, priority, subjectPriority, chapterPriority, mastery, subjectProgressGap: Math.round(subjectProgressGap), review: Math.round(review), evidence: Math.round(recentEvidence), feedback: adjustment },
    studyMethod: method,
  };
}

export function recommendTasks(subjects: Subject[], chapters: Chapter[], evidence: RecommendationEvidence = {}): StudyTask[] {
  return chapters.flatMap<StudyTask>((chapter) => {
    const subject = subjects.find((item) => item.id === chapter.subjectId);
    const chapterPreference = preferenceFor(chapter.id, evidence.preferences);
    if (!subject || chapter.status === "exam-ready" || chapterPreference?.excluded) return [];
    const scored = scoreChapter(subject, chapter, evidence.now ?? new Date(), evidence);
    const assessment = assessmentFor(subject.id, evidence.assessments);
    const method = scored.studyMethod;
    const mathematical = isMathematicalSubject(subject.id);
    const completedStages = mathematical
      ? (evidence.tasks ?? []).filter((task) => task.chapterId === chapter.id && task.workflowGroupId === `math-${chapter.id}` && task.workflowStage && (task.status === "completed" || task.status === "skipped")).map((task) => task.workflowStage ?? 0)
      : [];
    const completedStage = completedStages.length ? Math.max(...completedStages) : 0;
    const stage = mathematical && completedStage < mathematicalStages.length ? mathematicalStages[completedStage] : undefined;
    const stageMethod = stage && stage.compatibleMethods.includes(method) ? method : stage?.defaultMethod;
    const baseDuration = stage?.duration ?? Math.max(30, chapter.difficulty >= 4 ? 45 : assessment?.difficulty && assessment.difficulty >= 4 ? 45 : 35);
    const duration = Math.max(15, Math.min(baseDuration, evidence.preferredSessionMinutes ?? baseDuration));
    return [{
      id: stage ? `task-${chapter.id}-${stage.id}` : `task-${chapter.id}`,
      subjectId: subject.id,
      chapterId: chapter.id,
      title: stage ? `${chapter.title} · ${stage.label}` : chapter.title,
      plannedTime: "Unscheduled",
      duration,
      origin: "recommended" as const,
      status: "planned" as const,
      currentStep: 0,
      reason: stage ? `${scored.explanation} · Mathematical chapter stage ${mathematicalStages.indexOf(stage) + 1} of ${mathematicalStages.length}` : scored.explanation,
      priorityScore: scored.score,
      studyMethod: stageMethod ?? method,
      workflowPhase: stage?.phase ?? workflowPhaseFor(chapter),
      workflowStage: stage ? mathematicalStages.indexOf(stage) + 1 : undefined,
      workflowStageCount: stage ? mathematicalStages.length : undefined,
      workflowStageLabel: stage?.label,
      workflowGroupId: stage ? `math-${chapter.id}` : undefined,
      recommendationFactors: scored.factors,
    }];
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

export function rescoreStudyTasks(tasks: StudyTask[], subjects: Subject[], chapters: Chapter[], evidence: RecommendationEvidence = {}, now = new Date()) {
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  return tasks.map((task) => {
    if (task.status === "completed" || task.status === "skipped") return task;
    const subject = subjectsById.get(task.subjectId);
    const chapter = chaptersById.get(task.chapterId);
    if (!subject || !chapter) return task;
    const chapterPreference = preferenceFor(chapter.id, evidence.preferences);
    if (chapterPreference?.excluded || (chapter.status === "exam-ready" && task.workflowPhase !== "revise")) return { ...task, status: "skipped" as const, pinned: false, plannedStart: undefined, plannedEnd: undefined };
    const scored = scoreChapter(subject, chapter, now, evidence);
    const prefix = task.id.startsWith("revision-") ? "Revision due" : task.origin === "manual" || task.pinned ? "Pinned by you" : "Continue unfinished work";
    return {
      ...task,
      priorityScore: scored.score,
      reason: `${prefix} · ${scored.explanation}`,
      studyMethod: task.studyMethod ?? scored.studyMethod,
      recommendationFactors: scored.factors,
    };
  });
}

export type RecommendationEvidenceInput = RecommendationEvidence;
