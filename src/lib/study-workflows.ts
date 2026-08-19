import type { LearningMethod, StudyPhase, StudyTask, WorkflowPreset, WorkflowPresetSubjectType } from "./types";

export type { StudyPhase };

export const studyPhases: Array<{ id: StudyPhase; label: string; detail: string }> = [
  { id: "learn", label: "Learn a chapter", detail: "Use the textbook, class, guidebook, and first questions in order." },
  { id: "revise", label: "Revise a chapter", detail: "Retrieve from memory, repair weak spots, and revisit board patterns." },
  { id: "practice", label: "Practise questions", detail: "Move from textbook exercises to guidebook and past-paper practice." },
  { id: "exam", label: "Exam preparation", detail: "Attempt a timed set, mark it, and plan the next repair." },
];

export type CustomStudyWorkflow = {
  phase: StudyPhase;
  steps: string[];
  updatedAt?: string;
};

export const mathematicalSubjectIds = new Set(["mathematics", "accounting", "higher-mathematics"]);

export function workflowSubjectType(subjectId?: string): WorkflowPresetSubjectType {
  return subjectId && mathematicalSubjectIds.has(subjectId) ? "mathematical" : "theory";
}

const methodActions: Record<LearningMethod, string> = {
  "online-class": "Watch an online class for this chapter, pause at confusing points, and copy the teacher's worked example",
  textbook: "Read the assigned NCTB textbook section and annotate the definitions, rules, examples, or diagrams you need",
  guidebook: "Study the guidebook explanation and compare its solved examples with the NCTB textbook",
  "question-bank": "Attempt a targeted question-bank or previous-board set and identify the chapter patterns",
  video: "Watch a focused video explanation, then write down the part you still cannot explain",
  notes: "Review your condensed notes, then verify each important point against the NCTB textbook",
  tutor: "Review the tutor's assigned explanation and write the method you were told to follow",
  "group-study": "Explain the chapter to a friend or study partner and answer their follow-up questions",
  flashcards: "Run a recall round for the chapter terms, formulas, rules, and common traps",
};

const theoryWorkflows: Record<StudyPhase, string[]> = {
  learn: [
    "Read the assigned NCTB textbook section and mark definitions, dates, terms, diagrams, or key arguments",
    "Watch the matching online class or review the tutor's explanation; write down examples you could not follow",
    "Study the same topic from a guidebook and compare its CQ and MCQ patterns with the textbook",
    "Attempt 5–10 board-style questions or previous-board items without looking, then record the gaps",
  ],
  revise: [
    "Close the books and write a short outline of the chapter from memory",
    "Re-read only the textbook paragraphs, diagrams, and terms you missed or could not explain",
    "Use the guidebook to answer the chapter's common CQ, short-question, and MCQ patterns",
    "Attempt a small previous-board question set, mark the weak answers, and schedule the next repair",
  ],
  practice: [
    "Finish the relevant textbook exercises and write complete answers instead of only reading solutions",
    "Solve a guidebook set covering the chapter's CQ, short-question, and MCQ patterns",
    "Attempt a supplement of previous-board questions under a realistic time limit",
    "Mark your answers against the solution, classify each error, and write one correction rule",
  ],
  exam: [
    "Set the time and marks target for a mixed chapter test",
    "Attempt textbook, guidebook, and previous-board questions without notes or online help",
    "Mark every answer using the expected CQ, short-question, and MCQ standard",
    "List the lost marks, revise only those topics, and choose the next timed question set",
  ],
};

const mathematicalWorkflows: Record<StudyPhase, string[]> = {
  learn: [
    "Watch the chapter class online or learn the method from your tutor; copy each worked example step-by-step",
    "Build a formula or rule sheet and memorize what every symbol means and when the rule applies",
    "Work through the textbook examples and exercises without skipping algebra, workings, or ledger steps",
    "Use a guidebook for mixed problems, then mark every method you needed to look up",
  ],
  revise: [
    "Reproduce the formula, rule, or accounting treatment from memory before opening your notes",
    "Redo the textbook examples that previously required help and show every intermediate step",
    "Solve a guidebook set that mixes routine and unfamiliar problems from the chapter",
    "Attempt a previous-board supplement, analyse the exact step where marks were lost, and repeat it",
  ],
  practice: [
    "Complete a timed set from the textbook exercises, showing full workings for every answer",
    "Solve a guidebook set with mixed difficulty and do not check the method before committing to it",
    "Attempt a previous-board or test-paper supplement under SSC time and marks conditions",
    "Mark calculation, formula, method, and presentation errors, then redo every lost-mark question",
  ],
  exam: [
    "Write the formulas, rules, and common conditions from memory before starting the paper",
    "Attempt the mixed test paper under the exact time and marks limit without help",
    "Check every calculation, unit, sign, formula substitution, ledger format, and final answer",
    "Create a short error log and repeat the two question types that cost you the most marks",
  ],
};

export const recommendedWorkflows: Record<StudyPhase, string[]> = theoryWorkflows;

function uniqueSteps(steps: string[]) {
  return [...new Set(steps.map((step) => step.trim()).filter(Boolean))];
}

export function recommendedWorkflow(phase: StudyPhase, method?: LearningMethod, subjectType: WorkflowPresetSubjectType = "theory", preferredMethods: LearningMethod[] = []) {
  const source = subjectType === "mathematical" ? mathematicalWorkflows : theoryWorkflows;
  const orderedMethods = [...new Set([method, ...preferredMethods].filter((item): item is LearningMethod => Boolean(item)))];
  const personalizedActions = orderedMethods.map((item) => methodActions[item]);
  const anchors = subjectType === "mathematical"
    ? phase === "learn"
      ? ["Memorize the formulas, rules, or accounting treatment and write when each one applies", "Work through the NCTB textbook exercises with every intermediate step shown"]
      : phase === "revise"
        ? ["Reproduce the formulas, rules, or workings from memory before checking notes", "Redo the textbook problem where you previously lost marks"]
        : phase === "practice"
          ? ["Solve a mixed textbook and guidebook set without checking the method first", "Attempt a previous-board supplement under a time limit and redo every lost-mark question"]
          : ["Write formulas and conditions from memory before starting the paper", "Check calculations, signs, workings, and final answers, then repeat the costliest error"]
    : phase === "learn"
      ? ["Read the assigned NCTB textbook section and mark the exact terms, explanations, diagrams, or examples", "Attempt 5–10 board-style questions and record the gaps"]
      : phase === "revise"
        ? ["Close the books and write a short outline of the chapter from memory", "Attempt a small previous-board set and schedule a repair for each weak answer"]
        : phase === "practice"
          ? ["Complete the relevant textbook exercises with full answers", "Solve a guidebook or previous-board set, then classify every error"]
          : ["Attempt a timed mixed paper without notes or online help", "Mark lost marks and choose the next repair action"];
  return uniqueSteps([...personalizedActions, ...anchors, ...source[phase]]).slice(0, 6);
}

export function phaseForTask(task: StudyTask): StudyPhase {
  if (task.workflowPhase) return task.workflowPhase;
  if (task.origin === "manual") return "learn";
  if (task.reason.toLowerCase().includes("mistake") || task.reason.toLowerCase().includes("review")) return "revise";
  return "learn";
}

export function workflowForTask(task: StudyTask, custom: CustomStudyWorkflow[] = [], presets: WorkflowPreset[] = [], preferredMethods: LearningMethod[] = []) {
  const phase = phaseForTask(task);
  if (task.workflowSteps?.length) return { phase, steps: task.workflowSteps, preset: undefined as WorkflowPreset | undefined };
  const subjectType = workflowSubjectType(task.subjectId);
  const preset = presets.find((item) => item.phase === phase && (item.subjectType === subjectType || item.subjectType === "custom"));
  if (preset?.steps.length) return { phase, steps: preset.steps, preset };
  const saved = custom.find((workflow) => workflow.phase === phase);
  return { phase, steps: saved?.steps.length ? saved.steps : recommendedWorkflow(phase, task.studyMethod, subjectType, preferredMethods), preset: undefined as WorkflowPreset | undefined };
}

export const defaultWorkflowPresets: Omit<WorkflowPreset, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Theory: textbook → class → guidebook → board questions", description: "For Bangla, English, Science, Humanities, Commerce theory, religion, and other reading-heavy chapters.", phase: "learn", subjectType: "theory", steps: theoryWorkflows.learn },
  { name: "Maths: class → formulas → textbook → guidebook", description: "For Mathematics, Accounting, and Higher Mathematics when learning a new chapter.", phase: "learn", subjectType: "mathematical", steps: mathematicalWorkflows.learn },
  { name: "Theory: recall → repair → board patterns", description: "A practical revision loop for definitions, explanations, diagrams, and CQ answers.", phase: "revise", subjectType: "theory", steps: theoryWorkflows.revise },
  { name: "Maths: formulas → worked examples → mixed problems", description: "A revision loop for formulas, methods, workings, calculations, and repeated mistakes.", phase: "revise", subjectType: "mathematical", steps: mathematicalWorkflows.revise },
  { name: "Theory: textbook exercises → guidebook → past papers", description: "A question-practice sequence for theoretical SSC subjects.", phase: "practice", subjectType: "theory", steps: theoryWorkflows.practice },
  { name: "Maths: exercises → guidebook → test paper", description: "A structured practice sequence for mathematical subjects.", phase: "practice", subjectType: "mathematical", steps: mathematicalWorkflows.practice },
  { name: "Theory: timed paper → marking → repair", description: "Exam rehearsal for reading-heavy subjects with CQ, short questions, and MCQ.", phase: "exam", subjectType: "theory", steps: theoryWorkflows.exam },
  { name: "Maths: timed paper → checking → error log", description: "Exam rehearsal for Mathematics, Accounting, and Higher Mathematics.", phase: "exam", subjectType: "mathematical", steps: mathematicalWorkflows.exam },
];
