import test from "node:test";
import assert from "node:assert/strict";
import { buildAdaptivePlan, subjectProgressMap } from "../src/lib/adaptive-planner";
import { recommendTasks, rescoreStudyTasks } from "../src/lib/recommendations";
import type { Chapter, ChapterPreference, LearningPreferences, Mistake, StudyTask, Subject, SubjectAssessment } from "../src/lib/types";

const now = new Date("2026-08-25T12:00:00+06:00");
const examDate = "2027-03-14";

const subjects: Subject[] = [
  { id: "physics", name: "Physics", shortName: "Physics", strength: "moderate", weaknessScore: 50, workflow: "notebooklm", accent: "blue" },
  { id: "biology", name: "Biology", shortName: "Biology", strength: "moderate", weaknessScore: 50, workflow: "notebooklm", accent: "mint" },
];

const learningPreferences: LearningPreferences = {
  userId: "test-user",
  preferredMethods: ["textbook"],
  preferredResourceKinds: ["textbook"],
  sessionLengthMinutes: 45,
  weekdayMinutes: 120,
  weekendMinutes: 120,
  targetGrade: "A+",
  guidanceMode: "guided",
  planStrictness: "balanced",
  instructionRatio: 40,
  practiceRatio: 40,
  reviewRatio: 20,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

function assessment(subjectId: string, priority: SubjectAssessment["priority"] = 3): SubjectAssessment {
  return { userId: "test-user", subjectId, difficulty: 3, confidence: 3, priority, startingPoint: "uncertain", preferredMethods: ["textbook"] };
}

function chapter(subjectId: string, index: number, completed = false): Chapter {
  return {
    id: `${subjectId}-${index}`,
    subjectId,
    number: index,
    title: `${subjectId} chapter ${index}`,
    status: completed ? "exam-ready" : "not-started",
    confidence: completed ? 4 : 1,
    difficulty: 3,
    formats: [],
    questionsAttempted: 0,
    questionsCorrect: 0,
  };
}

function subjectChapters(subjectId: string, completedCount: number, total = 14) {
  return Array.from({ length: total }, (_, index) => chapter(subjectId, index + 1, index < completedCount));
}

function preferencesFor(chapters: Chapter[], overrides: Record<string, Partial<ChapterPreference>> = {}): ChapterPreference[] {
  return chapters.map((item) => ({ chapterId: item.id, includedForSsc: true, excluded: false, priority: 3, ...overrides[item.id] }));
}

function plan(chapters: Chapter[], preferences: ChapterPreference[], options: { tasks?: StudyTask[]; mistakes?: Mistake[]; assessments?: SubjectAssessment[]; availableMinutes?: number } = {}) {
  return buildAdaptivePlan({
    tasks: options.tasks ?? [],
    chapters,
    preferences,
    mistakes: options.mistakes ?? [],
    mocks: [],
    subjects,
    availableMinutes: options.availableMinutes ?? 45,
    learningPreferences,
    assessments: options.assessments ?? subjects.map((subject) => assessment(subject.id)),
    feedback: [],
    selectedSubjectIds: subjects.map((subject) => subject.id),
    examDate,
    now,
  });
}

function openTask(item: Chapter): StudyTask {
  return { id: `open-${item.id}`, subjectId: item.subjectId, chapterId: item.id, title: item.title, plannedTime: "Unscheduled", duration: 30, origin: "recommended", status: "planned", currentStep: 0, reason: "Old stored score", priorityScore: 50, workflowPhase: "learn" };
}

test("least-progressed Biology outranks Physics when other signals match", () => {
  const chapters = [...subjectChapters("physics", 13), ...subjectChapters("biology", 4)];
  const progress = subjectProgressMap(chapters);
  assert.ok(progress.physics > progress.biology);
  const result = plan(chapters, preferencesFor(chapters));
  assert.equal(result.selected[0]?.subjectId, "biology");
  assert.match(result.selected[0]?.reason ?? "", /Biology is \d+% progressed/);
});

test("open tasks are re-scored instead of trusting stale stored scores", () => {
  const chapters = [...subjectChapters("physics", 13), ...subjectChapters("biology", 4)];
  const physicsGap = chapters.find((item) => item.subjectId === "physics" && item.status === "not-started")!;
  const biologyGap = chapters.find((item) => item.subjectId === "biology" && item.status === "not-started")!;
  const stalePhysics = { ...openTask(physicsGap), priorityScore: 999 };
  const staleBiology = { ...openTask(biologyGap), priorityScore: 1 };
  const result = plan(chapters, preferencesFor(chapters), { tasks: [stalePhysics, staleBiology] });
  assert.equal(result.selected[0]?.subjectId, "biology");
  assert.notEqual(result.selected[0]?.priorityScore, 1);
});

test("a due revision overrides the least-progressed subject", () => {
  const chapters = [...subjectChapters("physics", 13), ...subjectChapters("biology", 4)];
  const physicsGap = chapters.find((item) => item.subjectId === "physics" && item.status === "not-started")!;
  const mistakes: Mistake[] = [{ id: "mistake-1", chapterId: physicsGap.id, prompt: "Force diagram", errorType: "Concept gap", reattemptDate: "2026-08-24", resolved: false, revisionCount: 1 }];
  const result = plan(chapters, preferencesFor(chapters), { mistakes });
  assert.equal(result.selected[0]?.subjectId, "physics");
  assert.match(result.selected[0]?.reason ?? "", /Repair Physics/);
});

test("explicit top subject and chapter priority can override a moderate progress difference", () => {
  const chapters = [...subjectChapters("physics", 8), ...subjectChapters("biology", 6)];
  const physicsGap = chapters.find((item) => item.subjectId === "physics" && item.status === "not-started")!;
  const preferences = preferencesFor(chapters, { [physicsGap.id]: { priority: 5 } });
  const assessments = [assessment("physics", 5), assessment("biology", 3)];
  const result = plan(chapters, preferences, { assessments });
  assert.equal(result.selected[0]?.subjectId, "physics");
  assert.match(result.selected[0]?.reason ?? "", /chapter priority 5\/5/);
});

test("completed and excluded chapters never become new-learning recommendations", () => {
  const completed = chapter("physics", 1, true);
  const excluded = chapter("biology", 1, false);
  const available = chapter("physics", 2, false);
  const chapters = [completed, excluded, available];
  const preferences = preferencesFor(chapters, { [excluded.id]: { excluded: true, includedForSsc: false } });
  const recommended = recommendTasks(subjects, chapters, { assessments: subjects.map((subject) => assessment(subject.id)), preferences, subjectProgress: subjectProgressMap([completed, available]), examDate, now });
  assert.deepEqual(recommended.map((task) => task.chapterId), [available.id]);
});

test("open tasks close immediately when their chapter is completed or excluded", () => {
  const completed = chapter("physics", 1, true);
  const excluded = chapter("biology", 1, false);
  const preferences = preferencesFor([completed, excluded], { [excluded.id]: { excluded: true, includedForSsc: false } });
  const rescored = rescoreStudyTasks(
    [openTask(completed), { ...openTask(excluded), pinned: true }],
    subjects,
    [completed, excluded],
    { preferences, subjectProgress: subjectProgressMap([completed]), now },
    now,
  );
  assert.deepEqual(rescored.map((task) => task.status), ["skipped", "skipped"]);
  assert.equal(rescored[1].pinned, false);
});

test("recommendations change immediately when subject progress changes", () => {
  const initial = [...subjectChapters("physics", 13), ...subjectChapters("biology", 4)];
  assert.equal(plan(initial, preferencesFor(initial)).selected[0]?.subjectId, "biology");
  const updated = [...subjectChapters("physics", 4), ...subjectChapters("biology", 13)];
  assert.equal(plan(updated, preferencesFor(updated)).selected[0]?.subjectId, "physics");
});

test("three close-score tasks from one subject are interrupted by a similar alternative", () => {
  const biology = [chapter("biology", 1), chapter("biology", 2), chapter("biology", 3)];
  const physics = [chapter("physics", 1)];
  const chapters = [...biology, ...physics];
  const tasks = [...biology.map(openTask), ...physics.map(openTask)];
  const result = plan(chapters, preferencesFor(chapters), { tasks, availableMinutes: 120 });
  assert.deepEqual(result.selected.map((task) => task.subjectId), ["biology", "biology", "physics", "biology"]);
  assert.ok(result.rationale.some((line) => line.includes("balanced across subjects")));
});
