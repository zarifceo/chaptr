import type { ExamPlanPhase } from "@/lib/types";

export const examPlanTemplates = [
  { id: "foundation", title: "Foundation & setup", objective: "Map the syllabus, close prerequisite gaps, and establish a sustainable routine." },
  { id: "coverage", title: "Coverage sprint", objective: "Learn the selected chapters and build first-pass understanding across subjects." },
  { id: "recall", title: "Active recall & writing", objective: "Retrieve without notes, practise CQ/SQ formats, and improve written answers." },
  { id: "mocks", title: "Mock exams & correction", objective: "Take timed papers, review every error, and turn mistakes into revision tasks." },
  { id: "revision", title: "Final revision", objective: "Consolidate weak chapters, formulae, definitions, and high-frequency question patterns." },
  { id: "readiness", title: "Exam readiness", objective: "Use light recall, exam strategy, and rest to arrive prepared rather than exhausted." },
] as const;

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00+06:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daySpan(start: string, end: string) {
  return Math.max(1, Math.round((new Date(`${end}T00:00:00+06:00`).getTime() - new Date(`${start}T00:00:00+06:00`).getTime()) / 86400000));
}

export function recommendedExamPlan(examDate: string, startDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date())): ExamPlanPhase[] {
  const safeExamDate = examDate > startDate ? examDate : addDays(startDate, 120);
  const totalDays = daySpan(startDate, safeExamDate);
  const boundaries = [0, .12, .42, .64, .82, .94, 1];
  return examPlanTemplates.map((template, index) => {
    const startOffset = index === 0 ? 0 : Math.max(0, Math.floor(totalDays * boundaries[index]));
    const endOffset = index === examPlanTemplates.length - 1 ? totalDays : Math.max(startOffset, Math.floor(totalDays * boundaries[index + 1]) - 1);
    return { id: `phase-${template.id}`, title: template.title, objective: template.objective, start: addDays(startDate, startOffset), end: addDays(startDate, endOffset), order: index };
  });
}

export function phaseDateLabel(start: string, end: string) {
  const format = (value: string) => new Date(`${value}T00:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
  return `${format(start)} — ${format(end)}`;
}
