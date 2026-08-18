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
  plannedStart?: string;
  plannedEnd?: string;
  duration: number;
  origin: "recommended" | "manual";
  pinned?: boolean;
  status: "planned" | "in-progress" | "completed" | "skipped";
  currentStep: number;
  reason: string;
  priorityScore: number;
  focusedSeconds?: number;
  deferredUntil?: string;
  studyMethod?: LearningMethod;
  workflowPhase?: StudyPhase;
  recommendationFactors?: Record<string, number>;
}

export interface ChapterPreference {
  chapterId: string;
  includedForSsc: boolean;
  targetMonth?: string;
  excluded: boolean;
  exclusionReason?: string;
  priority: 1 | 2 | 3 | 4 | 5;
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
  revisionCount?: number;
  lastAttemptedAt?: string;
  lastAttemptNote?: string;
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

export interface StudySession {
  id: string;
  taskId: string;
  subjectId: string;
  chapterId: string;
  mode: "focus" | "exam";
  startedAt: string;
  endedAt?: string;
  focusedSeconds: number;
  pauseSeconds: number;
  completed: boolean;
  questionsAttempted?: number;
  questionsCorrect?: number;
}

export type ResourceKind = "textbook" | "question-bank" | "video" | "notes" | "website" | "other";

export interface StudyResource {
  id: string;
  subjectId: string;
  chapterId: string;
  title: string;
  url: string;
  kind: ResourceKind;
  note?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export type ExamEventKind = "official" | "school" | "mock" | "custom";

export interface ExamEvent {
  id: string;
  name: string;
  start: string;
  end: string;
  kind: ExamEventKind;
  scope: string[];
  note?: string;
  locked?: boolean;
  archived?: boolean;
}

export interface ChapterEvidence {
  chapterId: string;
  sessions: number;
  focusedMinutes: number;
  journalEntries: number;
  attempted: number;
  correct: number;
  accuracy: number;
  openMistakes: number;
  resolvedMistakes: number;
  resources: number;
  lastEvidenceAt?: string;
  evidenceLevel: "none" | "light" | "working" | "exam-ready";
}

export type LearningMethod = "online-class" | "textbook" | "guidebook" | "question-bank" | "video" | "notes" | "tutor" | "group-study" | "flashcards";
export type GuidanceMode = "guided" | "balanced" | "quiet";
export type PlanStrictness = "flexible" | "balanced" | "strict";
export type StartingPoint = "comfortable" | "mixed" | "difficult" | "uncertain";
export type RecommendationFeedbackType = "useful" | "too-easy" | "too-hard" | "not-useful" | "not-today";
export type StudyPhase = "learn" | "revise" | "practice" | "exam";

export interface LearningPreferences {
  userId: string;
  preferredMethods: LearningMethod[];
  preferredResourceKinds: ResourceKind[];
  sessionLengthMinutes: number;
  sessionsPerDay: number;
  availableDays: string[];
  weekdayMinutes: number;
  weekendMinutes: number;
  targetGrade: string;
  guidanceMode: GuidanceMode;
  planStrictness: PlanStrictness;
  instructionRatio: number;
  practiceRatio: number;
  reviewRatio: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAssessment {
  id?: string;
  userId: string;
  subjectId: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  confidence: 1 | 2 | 3 | 4 | 5;
  priority: 1 | 2 | 3 | 4 | 5;
  startingPoint: StartingPoint;
  preferredMethods: LearningMethod[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendationFeedback {
  id?: string;
  userId: string;
  taskId?: string;
  subjectId?: string;
  chapterId?: string;
  feedbackType: RecommendationFeedbackType;
  method?: LearningMethod;
  note?: string;
  createdAt?: string;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  board: string;
  examYear: number;
  selectedSubjects: string[];
  dailyTarget: number;
  mainStart: string;
  mainEnd: string;
  onboardingStep: number;
  onboardingCompleted: boolean;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  termsVersion?: string;
  privacyVersion?: string;
  createdAt: string;
  updatedAt: string;
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

export interface AdaptivePlanSummary {
  usedMinutes: number;
  availableMinutes: number;
  deferredCount: number;
  generatedRevisionCount: number;
  rationale: string[];
  plannedAt: string;
}
