import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Chapter, Mistake, MockResult, StudyTask, Subject } from "./types";

const masteryGap = { "not-started": 100, learning: 72, practising: 42, "needs-revision": 78, "exam-ready": 8 } as const;

type RecommendationEvidence = { mistakes?: Mistake[]; mocks?: MockResult[] };

export function scoreChapter(subject: Subject, chapter: Chapter, now = new Date(), evidence: RecommendationEvidence = {}) {
  const daysToTest = Math.max(1, differenceInCalendarDays(parseISO("2026-10-28"), now));
  const urgency = Math.min(100, 7000 / daysToTest);
  const review = chapter.nextReview && parseISO(chapter.nextReview) <= now ? 100 : chapter.lastStudied ? 45 : 80;
  const accuracyGap = chapter.questionsAttempted ? (1 - chapter.questionsCorrect / chapter.questionsAttempted) * 100 : 55;
  const latestMock = evidence.mocks?.filter((mock) => mock.subjectId === subject.id).sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
  const mockGap = latestMock?.total ? (1 - latestMock.score / latestMock.total) * 100 : 0;
  const hasOpenMistake = evidence.mistakes?.some((mistake) => mistake.chapterId === chapter.id && !mistake.resolved);
  const recentEvidence = Math.max(accuracyGap, mockGap, hasOpenMistake ? 100 : 0);
  const score = urgency * .30 + subject.weaknessScore * .25 + masteryGap[chapter.status] * .20 + review * .15 + recentEvidence * .10;
  const reasons = [subject.strength === "toughest" ? "priority weakness" : "result protection", chapter.status === "not-started" ? "first coverage" : "mastery gap", hasOpenMistake ? "open mistake" : review >= 80 ? "review due" : latestMock ? "mock evidence" : "recent evidence"];
  return { score: Math.round(score), explanation: reasons.join(" · ") };
}

export function recommendTasks(subjects: Subject[], chapters: Chapter[], evidence: RecommendationEvidence = {}): StudyTask[] {
  return chapters.map<StudyTask>((chapter) => {
    const subject = subjects.find((item) => item.id === chapter.subjectId)!;
    const scored = scoreChapter(subject, chapter, new Date(), evidence);
    return { id: `task-${chapter.id}`, subjectId: subject.id, chapterId: chapter.id, title: chapter.title, plannedTime: subject.id === "mathematics" ? "8:00 PM" : "3:00 PM", duration: subject.id === "mathematics" ? 105 : 55, origin: "recommended" as const, status: "planned" as const, currentStep: 0, reason: scored.explanation, priorityScore: scored.score };
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.priorityScore - a.priorityScore);
}
