import type { LearningMethod, StudyPhase, StudyTask } from "./types";

export type { StudyPhase };

export const studyPhases: Array<{ id: StudyPhase; label: string; detail: string }> = [
  { id: "learn", label: "Learn a chapter", detail: "Build the first clear understanding." },
  { id: "revise", label: "Revise a chapter", detail: "Retrieve, repair, and tighten weak spots." },
  { id: "practice", label: "Practise questions", detail: "Turn understanding into reliable answers." },
  { id: "exam", label: "Exam preparation", detail: "Work under realistic time and marking pressure." },
];

export type CustomStudyWorkflow = {
  phase: StudyPhase;
  steps: string[];
  updatedAt?: string;
};

const methodFirstStep: Partial<Record<LearningMethod, string>> = {
  "online-class": "Watch the focused lesson",
  textbook: "Read the selected section",
  guidebook: "Study the worked example",
  "question-bank": "Open a targeted question set",
  video: "Watch the focused explanation",
  notes: "Review your condensed notes",
  tutor: "Review the teacher target",
  "group-study": "Explain the idea aloud",
  flashcards: "Run a recall round",
};

export const recommendedWorkflows: Record<StudyPhase, string[]> = {
  learn: ["Understand the core idea", "Recall it without looking", "Try five starter questions", "Log the first gap"],
  revise: ["Recall the chapter from memory", "Check and repair weak spots", "Reattempt five targeted questions", "Log what changed"],
  practice: ["Attempt a focused question set", "Mark uncertain answers", "Review the worked solutions", "Log the recurring gap"],
  exam: ["Set the time and marks target", "Attempt the section without help", "Mark and analyse every error", "Choose the next repair action"],
};

export function phaseForTask(task: StudyTask): StudyPhase {
  if (task.workflowPhase) return task.workflowPhase;
  if (task.origin === "manual") return "learn";
  if (task.reason.toLowerCase().includes("mistake") || task.reason.toLowerCase().includes("review")) return "revise";
  return "learn";
}

export function recommendedWorkflow(phase: StudyPhase, method?: LearningMethod) {
  const steps = [...recommendedWorkflows[phase]];
  if (method && methodFirstStep[method]) steps[0] = methodFirstStep[method]!;
  return steps;
}

export function workflowForTask(task: StudyTask, custom: CustomStudyWorkflow[] = []) {
  const phase = phaseForTask(task);
  if (task.workflowSteps?.length) return { phase, steps: task.workflowSteps };
  const saved = custom.find((workflow) => workflow.phase === phase);
  return { phase, steps: saved?.steps.length ? saved.steps : recommendedWorkflow(phase, task.studyMethod) };
}
