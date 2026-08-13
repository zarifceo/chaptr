export type StrengthLevel = "strongest" | "very-strong" | "moderate" | "toughest";
export type MasteryStatus = "not-started" | "learning" | "practising" | "exam-ready" | "needs-revision";
export type WorkflowKind = "notebooklm" | "accounting" | "bangla-1" | "bangla-2" | "english" | "mathematics";

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  strength: StrengthLevel;
  weaknessScore: number;
  workflow: WorkflowKind;
  accent: "lilac" | "mint" | "yellow" | "pink" | "blue";
}

export interface Chapter {
  id: string;
  subjectId: string;
  number?: number;
  title: string;
  division?: string;
  note?: string;
  status: MasteryStatus;
  confidence: 1 | 2 | 3 | 4 | 5;
  formats: string[];
  lastStudied?: string;
  nextReview?: string;
  questionsAttempted: number;
  questionsCorrect: number;
}

export interface MarksDistribution {
  subjectId: string;
  part?: string;
  questionType: string;
  rule: string;
  marks: number;
}

export interface StudyTask {
  id: string;
  subjectId: string;
  chapterId: string;
  title: string;
  plannedTime: string;
  duration: number;
  origin: "recommended" | "manual";
  pinned?: boolean;
  status: "planned" | "in-progress" | "completed" | "skipped";
  currentStep: number;
  reason: string;
  priorityScore: number;
  focusedSeconds?: number;
  deferredUntil?: string;
}

export interface JournalEntry {
  id: string;
  taskId: string;
  subjectId: string;
  chapterId: string;
  minutes: number;
  attempted: number;
  correct: number;
  confidenceBefore: number;
  confidenceAfter: number;
  learningGoal: string;
  resources: string[];
  mistakesText?: string;
  writtenScore?: number;
  reflection: string;
  nextAction: string;
  createdAt: string;
}

export interface Mistake {
  id: string;
  chapterId: string;
  prompt: string;
  errorType: string;
  reattemptDate: string;
  resolved: boolean;
}

export interface MockResult {
  id: string;
  subjectId: string;
  paperType: string;
  score: number;
  total: number;
  durationMinutes?: number;
  takenAt: string;
}

export interface PlanningSettings {
  mainStart: string;
  mainEnd: string;
  mathStart: string;
  mathEnd: string;
  dailyTarget: number;
  mathDaysPerWeek: number;
  agricultureDaysPerWeek: number;
  remindersEnabled: boolean;
}
