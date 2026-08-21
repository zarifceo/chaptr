import { ArrowRight, CheckCircle, Play, Plus, Sparkle, Target, X } from "@phosphor-icons/react";
import type { Chapter, ChapterPreference, StudyTask } from "@/lib/types";

export type QuickStartStatus = "active" | "dismissed" | "completed";

type QuickStartProps = {
  status: QuickStartStatus;
  tasks: StudyTask[];
  chapters: Chapter[];
  preferences: ChapterPreference[];
  hasEvidence: boolean;
  onGo: (section: string) => void;
  onAddTask: () => void;
  onStartTask: (task: StudyTask) => void;
  onStatusChange: (status: QuickStartStatus) => void | Promise<void>;
};

const availableTask = (tasks: StudyTask[]) => tasks.find((task) => task.status !== "completed" && task.status !== "skipped") ?? tasks[0];

export function QuickStart({ status, tasks, chapters, preferences, hasEvidence, onGo, onAddTask, onStartTask, onStatusChange }: QuickStartProps) {
  if (status === "completed") return null;

  const hasGoal = preferences.some((item) => !item.excluded && (item.includedForSsc || Boolean(item.targetMonth))) || chapters.some((chapter) => chapter.status === "exam-ready");
  const firstTask = availableTask(tasks);
  const hasTask = Boolean(firstTask);
  const steps = [
    { id: "goals", label: "Choose your coverage", detail: "Keep the subjects and chapters you actually plan to study.", done: hasGoal },
    { id: "task", label: "Create today’s first task", detail: "Turn one chapter into a focused action for today.", done: hasTask },
    { id: "focus", label: "Complete one study loop", detail: "Start focus, work through the steps, and close with evidence.", done: hasEvidence },
  ] as const;
  const completedCount = steps.filter((step) => step.done).length;
  const progress = Math.round(completedCount / steps.length * 100);
  const activeIndex = steps.findIndex((step) => !step.done);
  const nextIndex = activeIndex === -1 ? steps.length - 1 : activeIndex;
  const nextStep = steps[nextIndex];

  if (status === "dismissed") {
    return <aside className="quick-start-reopen" aria-label="Quick start guide"><span className="quick-start-reopen-icon"><Sparkle weight="fill" /></span><div><strong>Need a clear next step?</strong><p>Your quick start guide is paused. You can reopen it whenever you want.</p></div><button type="button" onClick={() => void onStatusChange("active")}>Reopen guide <ArrowRight /></button></aside>;
  }

  const handlePrimary = () => {
    if (nextStep.id === "goals") return onGo("Goals");
    if (nextStep.id === "task") return onAddTask();
    if (firstTask) return onStartTask(firstTask);
    return onGo("Home");
  };

  return <section className="quick-start-panel" aria-labelledby="quick-start-title">
    <div className="quick-start-header">
      <div>
        <span className="quick-start-kicker"><Sparkle weight="fill" /> FIRST WEEK RUNWAY</span>
        <h2 id="quick-start-title">Start with one study day.</h2>
        <p>Chaptr works best when you do not try to configure everything at once. Follow these three moves, then the daily loop will take over.</p>
      </div>
      <button type="button" className="quick-start-dismiss" onClick={() => void onStatusChange("dismissed")} aria-label="Pause quick start guide" title="Pause quick start guide"><X /></button>
    </div>
    <div className="quick-start-progress" aria-label={`${completedCount} of ${steps.length} quick-start steps complete`} role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completedCount}>
      <div className="quick-start-progress-track"><span style={{ width: `${progress}%` }} /></div>
      <strong>{completedCount}/{steps.length}</strong>
    </div>
    <div className="quick-start-steps">
      {steps.map((step, index) => <button type="button" key={step.id} className={`quick-start-step ${step.done ? "complete" : index === nextIndex ? "current" : "later"}`} onClick={() => {
        if (step.id === "goals") return onGo("Goals");
        if (step.id === "task") return onAddTask();
        if (firstTask) return onStartTask(firstTask);
        return onGo("Home");
      }}>
        <span className="quick-start-step-index">{step.done ? <CheckCircle weight="fill" /> : index + 1}</span>
        <span className="quick-start-step-copy"><strong>{step.label}</strong><small>{step.detail}</small></span>
        <ArrowRight className="quick-start-step-arrow" />
      </button>)}
    </div>
    <div className="quick-start-footer">
      <span>{completedCount === steps.length ? "Your first loop is complete." : `Next: ${nextStep.label}`}</span>
      {completedCount === steps.length ? <button type="button" className="quick-start-primary" onClick={() => void onStatusChange("completed")}>Finish quick start <CheckCircle weight="fill" /></button> : <button type="button" className="quick-start-primary" onClick={handlePrimary}>{nextStep.id === "goals" ? <><Target />Open goals</> : nextStep.id === "task" ? <><Plus />Add first task</> : <><Play weight="fill" />Start study flow</>}</button>}
    </div>
  </section>;
}
