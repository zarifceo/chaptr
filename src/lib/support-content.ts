export const supportCategories = [
  { id: "getting-started", label: "Getting started", description: "Set up your academic profile and know what to do first." },
  { id: "tasks-study-flow", label: "Tasks and study flow", description: "Build tasks, tailor steps, and close the loop after studying." },
  { id: "syllabus-goals", label: "Syllabus and Goals", description: "Track chapters, priorities, difficulty, and completion." },
  { id: "calendar", label: "Calendar", description: "Plan dates, manage tasks, and keep your study plan visible." },
  { id: "resources", label: "Resources", description: "Add board books, guidebooks, links, and uploaded files." },
  { id: "account-privacy", label: "Account and privacy", description: "Manage sign-in, profile data, policies, and deletion requests." },
  { id: "planning-recommendations", label: "Planning and recommendations", description: "Understand the adaptive planner and personalized signals." },
] as const;

export type SupportCategory = (typeof supportCategories)[number]["id"];
export type SupportRequestStatus = "open" | "in_review" | "resolved" | "closed";
export type DeletionRequestStatus = "requested" | "pending_review" | "processing" | "completed" | "cancelled";

export type SupportBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "note"; text: string };

export type SupportArticle = {
  slug: string;
  title: string;
  summary: string;
  category: SupportCategory;
  keywords: string[];
  body: SupportBlock[];
  popular?: boolean;
  readingMinutes: number;
  updatedAt: string;
};

export type SupportRequest = {
  id: string;
  referenceCode: string;
  category: SupportCategory;
  pageContext?: string;
  description: string;
  expectedBehavior?: string;
  diagnosticDetails?: Record<string, string>;
  status: SupportRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccountDeletionRequest = {
  id: string;
  referenceCode: string;
  status: DeletionRequestStatus;
  requestedAt: string;
  confirmedAt: string;
  scheduledFor?: string;
  completedAt?: string;
  cancelledAt?: string;
};

export const supportArticles: SupportArticle[] = [
  {
    slug: "first-day-in-chaptr",
    title: "What to do after creating your account",
    summary: "Complete your academic profile, map finished chapters, and start with one focused task.",
    category: "getting-started",
    keywords: ["onboarding", "group", "religion", "fourth subject", "completed chapters"],
    popular: true,
    readingMinutes: 2,
    updatedAt: "2026-08-21",
    body: [
      { type: "paragraph", text: "Chaptr starts with your real situation rather than assuming you are beginning from zero. Your group, religion subject, fourth subject, difficult subject, study methods, and completed chapters shape the workspace." },
      { type: "steps", items: ["Finish the academic profile so Chaptr can show the right subjects and Bangla books.", "Mark chapters you completed before joining. You can revise this map later from Syllabus.", "Choose the one subject that feels most difficult to you. This is a personal planning signal, not a universal ranking.", "Open Home and start the first Do Now task. Close the loop with a journal entry when you finish." ] },
      { type: "note", text: "You can change your academic and study preferences later from Settings." },
    ],
  },
  {
    slug: "create-a-study-task",
    title: "Create a study task with useful steps",
    summary: "Choose a subject, chapter, date, time, and a learning or revision workflow.",
    category: "tasks-study-flow",
    keywords: ["task", "date", "time", "workflow", "steps", "study"],
    popular: true,
    readingMinutes: 2,
    updatedAt: "2026-08-21",
    body: [
      { type: "steps", items: ["Use Add task from Home or Calendar.", "Choose the subject and chapter, then set a date, time, and duration.", "Select the phase: learn, revise, practice, or exam.", "Review the personalized steps. They are suggestions, so edit, reorder, remove, or add steps for this task.", "Save the task. It appears in your plan and remains database-backed across devices." ] },
      { type: "note", text: "Tasks cannot be saved without a date and planned time. This prevents unscheduled work from disappearing into an unclear queue." },
    ],
  },
  {
    slug: "complete-or-reopen-a-chapter",
    title: "Mark a chapter complete or reopen it",
    summary: "Completion is reversible, so an accidental mark or a later revision need is easy to handle.",
    category: "syllabus-goals",
    keywords: ["chapter", "complete", "undo", "reopen", "syllabus", "goals"],
    popular: true,
    readingMinutes: 1,
    updatedAt: "2026-08-21",
    body: [
      { type: "paragraph", text: "Use Syllabus or Goals to mark a chapter exam-ready. If your confidence changes, choose Undo complete to return it to learning. The updated status is saved to your profile data." },
      { type: "note", text: "Completing a chapter does not remove it. It remains available for revision, tasks, and evidence." },
    ],
  },
  {
    slug: "focus-timer-and-page-switching",
    title: "Keep the focus timer running while you move around",
    summary: "The timer is saved as study-session state instead of depending on one page staying open.",
    category: "tasks-study-flow",
    keywords: ["timer", "focus", "pause", "session", "device"],
    readingMinutes: 1,
    updatedAt: "2026-08-21",
    body: [
      { type: "steps", items: ["Start Focus on a task from Home.", "Switch sections when you need to check a chapter or resource; the session state remains saved.", "Return to Home or Exam Mode to pause, resume, reset, or finish the session.", "Add a journal entry to record what you attempted and what you will do next." ] },
    ],
  },
  {
    slug: "use-study-calendar",
    title: "Use the in-app study calendar",
    summary: "Place study tasks on dates, move between months, and keep your plan in one place.",
    category: "calendar",
    keywords: ["calendar", "dates", "schedule", "tasks", "study plan"],
    popular: true,
    readingMinutes: 1,
    updatedAt: "2026-08-21",
    body: [
      { type: "steps", items: ["Open Calendar from the app navigation.", "Choose Add task or select a date in the month view to create study work.", "Use the date controls beside unscheduled tasks to place them into your plan.", "Open any scheduled task to continue it from the daily study flow." ] },
      { type: "note", text: "The in-app calendar is the single source of truth for your study schedule. Your tasks and dates remain available across sessions through your account." },
    ],
  },
  {
    slug: "add-a-resource",
    title: "Add a textbook, guidebook, link, or file",
    summary: "Attach study material to the exact subject and chapter where you will use it.",
    category: "resources",
    keywords: ["resource", "upload", "file", "textbook", "guidebook", "120 MB"],
    popular: true,
    readingMinutes: 2,
    updatedAt: "2026-08-21",
    body: [
      { type: "steps", items: ["Open Resources and choose Add resource.", "Select a subject and chapter, then choose the resource kind.", "Paste a link or drag a file into the upload area. Each file must be 120 MB or smaller.", "Save the resource and use Open later from the chapter’s resource list." ] },
      { type: "note", text: "Uploaded files are stored in your private Supabase storage area. Chaptr does not use local-only storage for resources." },
    ],
  },
  {
    slug: "personalized-recommendations",
    title: "How Chaptr personalizes recommendations",
    summary: "Recommendations combine your chapter evidence, preferences, feedback, and one personal difficult-subject signal.",
    category: "planning-recommendations",
    keywords: ["recommendation", "adaptive", "difficulty", "personalized", "planner"],
    readingMinutes: 2,
    updatedAt: "2026-08-21",
    body: [
      { type: "paragraph", text: "Chaptr does not treat Mathematics as universally difficult. Your selected difficult subject is one personal signal among chapter confidence, difficulty, priority, mistakes, mock results, study methods, and recent activity." },
      { type: "note", text: "Changing the difficult-subject setting changes future recommendations; it does not rewrite your existing evidence." },
    ],
  },
  {
    slug: "reset-password-and-sign-in",
    title: "Sign in, verify your email, or reset your password",
    summary: "Use the separate auth routes for account creation, verification, and password recovery.",
    category: "account-privacy",
    keywords: ["sign in", "email", "verification", "password", "reset"],
    readingMinutes: 1,
    updatedAt: "2026-08-21",
    body: [
      { type: "steps", items: ["Use Create new account for a new Chaptr profile.", "Open the verification link from the same email account you used to sign up.", "Use Forgot password? to open the reset-password route.", "If a session looks stale, sign out and sign in again. Your database-backed workspace data remains attached to your account." ] },
    ],
  },
  {
    slug: "request-account-deletion",
    title: "Request deletion of your Chaptr account",
    summary: "Start a protected deletion request and understand what data may be affected before confirming.",
    category: "account-privacy",
    keywords: ["delete", "deletion", "privacy", "account", "remove data"],
    readingMinutes: 2,
    updatedAt: "2026-08-21",
    body: [
      { type: "paragraph", text: "A verified deletion request starts a 14-day grace period. If you sign in again during that window, the pending request is cancelled automatically and your account and Chaptr data are preserved." },
      { type: "steps", items: ["Open Account and privacy, then choose Request account deletion.", "Read the data-impact summary and confirm the signed-in email shown on screen.", "Type DELETE MY ACCOUNT exactly.", "Choose Request deletion once. The system blocks duplicate active requests and gives you a reference code.", "If you change your mind, sign in during the 14-day window or use Cancel deletion request from Support." ] },
      { type: "note", text: "After the grace period ends, the system removes your Chaptr account and owned data automatically. Do not enter a password, token, calendar credential, or other secret in a support or deletion request." },
    ],
  },
  {
    slug: "request-help-from-support",
    title: "Contact Chaptr support when self-service is not enough",
    summary: "Send a structured request with the details needed to understand and reproduce the problem.",
    category: "account-privacy",
    keywords: ["contact", "support", "bug", "problem", "request"],
    readingMinutes: 2,
    updatedAt: "2026-08-21",
    body: [
      { type: "steps", items: ["Search Support first and open the closest article.", "Choose Contact support and select an issue type.", "Describe what happened, where it happened, and what you expected.", "Optionally include safe diagnostic details such as the route, viewport class, browser family, app version, and time.", "Submit once and keep the reference code for follow-up." ] },
      { type: "note", text: "Chaptr does not promise a fixed response time in the first release. We will review the request and use the account email as the reply identity." },
    ],
  },
];

export function categoryLabel(category: SupportCategory) {
  return supportCategories.find((item) => item.id === category)?.label ?? "Support";
}

export function statusLabel(status: SupportRequestStatus | DeletionRequestStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function findSupportArticle(slug: string) {
  return supportArticles.find((article) => article.slug === slug);
}

export function searchSupportArticles(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return supportArticles;
  return supportArticles.filter((article) => [article.title, article.summary, article.category, ...article.keywords].join(" ").toLowerCase().includes(normalized));
}

type SupportRequestRow = {
  id: string;
  reference_code: string;
  category: SupportCategory;
  page_context: string | null;
  description: string;
  expected_behavior: string | null;
  diagnostic_details: Record<string, string> | null;
  status: SupportRequestStatus;
  created_at: string;
  updated_at: string;
};

export function supportRequestFromRow(row: SupportRequestRow): SupportRequest {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    category: row.category,
    pageContext: row.page_context ?? undefined,
    description: row.description,
    expectedBehavior: row.expected_behavior ?? undefined,
    diagnosticDetails: row.diagnostic_details ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type DeletionRequestRow = {
  id: string;
  reference_code: string;
  status: DeletionRequestStatus;
  requested_at: string;
  confirmed_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

export function deletionRequestFromRow(row: DeletionRequestRow): AccountDeletionRequest {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    status: row.status,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
    scheduledFor: row.scheduled_for ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
  };
}

export const ACTIVE_DELETION_STATUSES: DeletionRequestStatus[] = ["requested", "pending_review", "processing"];
