import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Chapter, Mistake, MockResult, RecommendationFeedback, StudyTask, Subject, SubjectAssessment, LearningMethod, StrengthLevel } from "./types";

const masteryGap = { "not-started": 100, learning: 72, practising: 42, "needs-revision": 78, "exam-ready": 8 } as const;

type RecommendationEvidence = {
  mistakes?: Mistake[];
  mocks?: MockResult[];
  assessments?: SubjectAssessment[];
  feedback?: RecommendationFeedback[];
  mostDifficultSubjectId?: string;
  subjectStrengths?: Record<string, StrengthLevel>;
  examDate?: string;
  targetGrade?: string;
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

function feedbackAdjustment(subjectId: string, feedback: RecommendationFeedback[] = []) {
  const recent = feedback.filter((item) => item.subjectId === subjectId).slice(0, 8);
  return recent.reduce((total, item) => total + (item.feedbackType === "too-hard" ? 7 : item.feedbackType === "useful" ? 3 : item.feedbackType === "too-easy" ? -5 : item.feedbackType === "not-useful" ? -3 : -1), 0);
}

function preferredMethod(assessment?: SubjectAssessment) {
  return assessment?.preferredMethods?.[0] ?? "textbook";
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
  const personalDifficulty = (assessment?.difficulty ?? 3) * 20;
  const chapterDifficulty = chapter.difficulty * 20;
  const strength = evidence.subjectStrengths?.[subject.id];
  const strengthDifficulty = strength === "toughest" ? 12 : strength === "moderate" ? 8 : strength === "very-strong" ? 4 : 0;
  const personalSubjectSignal = evidence.mostDifficultSubjectId === subject.id ? 15 : 0;
  const difficulty = Math.min(100, Math.round((personalDifficulty + chapterDifficulty) / 2) + strengthDifficulty + personalSubjectSignal);
  const priority = (assessment?.priority ?? 3) * 20;
  const recentEvidence = Math.max(accuracyGap, mockGap, hasOpenMistake ? 100 : 0);
  const adjustment = feedbackAdjustment(subject.id, evidence.feedback);
  const score = urgency * .18 + difficulty * .22 + priority * .14 + masteryGap[chapter.status] * .20 + review * .14 + recentEvidence * .12 + adjustment;
  const method = preferredMethod(assessment);
  const reasons = [
    evidence.mostDifficultSubjectId === subject.id ? "your selected difficult subject" : strength ? `your ${strength.replace("-", " ")} self-rating` : chapter.difficulty >= 4 ? "chapter difficulty" : assessment?.startingPoint === "difficult" || (assessment?.difficulty ?? 3) >= 4 ? "your difficulty profile" : "balanced coverage",
    chapter.status === "not-started" ? "first coverage" : "mastery gap",
    hasOpenMistake ? "open mistake" : review >= 80 ? "review due" : latestMock ? "mock evidence" : "recent evidence",
    `fits ${methodLabels[method]}`,
  ];
  return {
    score: Math.max(0, Math.round(score)),
    explanation: reasons.join(" · "),
    factors: { urgency: Math.round(urgency), difficulty, priority: Math.round(priority), mastery: masteryGap[chapter.status], review: Math.round(review), evidence: Math.round(recentEvidence), feedback: adjustment },
    studyMethod: method,
  };
}

export function recommendTasks(subjects: Subject[], chapters: Chapter[], evidence: RecommendationEvidence = {}): StudyTask[] {
  return chapters.map<StudyTask>((chapter) => {
    const subject = subjects.find((item) => item.id === chapter.subjectId)!;
    const scored = scoreChapter(subject, chapter, new Date(), evidence);
    const assessment = assessmentFor(subject.id, evidence.assessments);
    const method = scored.studyMethod;
    const duration = Math.max(30, chapter.difficulty >= 4 ? 45 : assessment?.difficulty && assessment.difficulty >= 4 ? 45 : 35);
    return {
      id: `task-${chapter.id}`,
      subjectId: subject.id,
      chapterId: chapter.id,
      title: chapter.title,
      plannedTime: "Unscheduled",
      duration,
      origin: "recommended" as const,
      status: "planned" as const,
      currentStep: 0,
      reason: scored.explanation,
      priorityScore: scored.score,
      studyMethod: method,
      workflowPhase: workflowPhaseFor(chapter),
      recommendationFactors: scored.factors,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

export type RecommendationEvidenceInput = RecommendationEvidence;
