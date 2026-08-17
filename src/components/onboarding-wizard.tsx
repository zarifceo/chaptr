"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, Clock, GraduationCap, Lightning, PlayCircle, Sparkle, Target } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { LearningMethod, LearningPreferences, Subject, SubjectAssessment, StartingPoint, UserProfile } from "@/lib/types";

const methodOptions: Array<{ id: LearningMethod; label: string; detail: string }> = [
  { id: "online-class", label: "Online classes", detail: "Live or recorded lessons" },
  { id: "textbook", label: "Textbooks", detail: "Read and annotate the chapter" },
  { id: "guidebook", label: "Guidebooks", detail: "Worked examples and explanations" },
  { id: "question-bank", label: "Question banks", detail: "Practice papers and CQ/MCQ sets" },
  { id: "video", label: "Short videos", detail: "Visual explanations and recap" },
  { id: "notes", label: "My own notes", detail: "Recall from condensed notes" },
  { id: "tutor", label: "Tutor support", detail: "Ask and practise with a teacher" },
  { id: "group-study", label: "Group study", detail: "Discuss and explain to friends" },
];

const steps = ["Your target", "Your time", "Difficulty map", "How you learn", "Your rhythm", "Your coverage", "Your first week"];
const defaultAssessment = (userId: string, subjectId: string): SubjectAssessment => ({ userId, subjectId, difficulty: 3, confidence: 3, priority: 3, startingPoint: "uncertain", preferredMethods: [] });

type AdaptiveSave = (patch: Partial<LearningPreferences>, assessments?: SubjectAssessment[]) => Promise<void>;

export function OnboardingWizard({ profile, subjects, save, saveAdaptive, startPlan }: { profile: UserProfile; subjects: Subject[]; save: (patch: Partial<UserProfile>) => Promise<void>; saveAdaptive: AdaptiveSave; startPlan: () => void }) {
  const [step, setStep] = useState(Math.min(6, Math.max(0, profile.onboardingStep)));
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [board, setBoard] = useState(profile.board || "Dhaka");
  const [examYear, setExamYear] = useState(profile.examYear || 2027);
  const [targetGrade, setTargetGrade] = useState("A");
  const [weekdayMinutes, setWeekdayMinutes] = useState(120);
  const [weekendMinutes, setWeekendMinutes] = useState(180);
  const [sessionLength, setSessionLength] = useState(45);
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [guidanceMode, setGuidanceMode] = useState<LearningPreferences["guidanceMode"]>("guided");
  const [strictness, setStrictness] = useState<LearningPreferences["planStrictness"]>("flexible");
  const [selected, setSelected] = useState<string[]>(profile.selectedSubjects);
  const [methods, setMethods] = useState<LearningMethod[]>(["textbook", "question-bank"]);
  const [assessments, setAssessments] = useState<SubjectAssessment[]>(subjects.map((subject) => defaultAssessment(profile.userId, subject.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedAssessments = useMemo(() => assessments.filter((assessment) => selected.includes(assessment.subjectId)), [assessments, selected]);
  const updateAssessment = (subjectId: string, patch: Partial<SubjectAssessment>) => setAssessments((current) => current.map((assessment) => assessment.subjectId === subjectId ? { ...assessment, ...patch } : assessment));
  const toggleMethod = (method: LearningMethod) => setMethods((current) => current.includes(method) ? current.filter((item) => item !== method) : [...current, method]);
  const toggleSubject = (subjectId: string) => setSelected((current) => current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId]);

  const commit = async (nextStep: number, adaptivePatch?: Partial<LearningPreferences>, assessmentRows?: SubjectAssessment[]) => {
    setBusy(true);
    setError("");
    try {
      await save({ displayName: displayName.trim() || undefined, board, examYear, selectedSubjects: selected, dailyTarget: weekdayMinutes, mainStart: "15:00", mainEnd: "19:00", onboardingStep: nextStep });
      if (adaptivePatch || assessmentRows) await saveAdaptive(adaptivePatch ?? {}, assessmentRows);
      setStep(nextStep);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this step. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (step === 0) return commit(1, { targetGrade });
    if (step === 1) return commit(2, { weekdayMinutes, weekendMinutes, sessionLengthMinutes: sessionLength, sessionsPerDay });
    if (step === 2) return commit(3, undefined, selectedAssessments);
    if (step === 3) return commit(4, { preferredMethods: methods, preferredResourceKinds: methods.filter((method) => ["textbook", "guidebook", "question-bank", "video", "notes"].includes(method)) as LearningPreferences["preferredResourceKinds"], instructionRatio: 30, practiceRatio: 50, reviewRatio: 20 });
    if (step === 4) return commit(5, { guidanceMode, planStrictness: strictness });
    if (step === 5) return commit(6, { targetGrade }, selectedAssessments);
    await commit(7, { targetGrade, weekdayMinutes, weekendMinutes, sessionLengthMinutes: sessionLength, sessionsPerDay, preferredMethods: methods, guidanceMode, planStrictness: strictness }, selectedAssessments);
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      await save({ displayName: displayName.trim() || undefined, board, examYear, selectedSubjects: selected, dailyTarget: weekdayMinutes, onboardingStep: 7, onboardingCompleted: true });
      await saveAdaptive({ targetGrade, weekdayMinutes, weekendMinutes, sessionLengthMinutes: sessionLength, sessionsPerDay, preferredMethods: methods, guidanceMode, planStrictness: strictness }, selectedAssessments);
      startPlan();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open your study plan. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    try {
      await save({ selectedSubjects: selected, onboardingStep: 7, onboardingCompleted: true });
      startPlan();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not skip setup.");
    } finally {
      setBusy(false);
    }
  };

  const currentSubject = (id: string) => subjects.find((subject) => subject.id === id);
  const stepTitle = ["What result are you working toward?", "How much time is actually available?", "Which subjects feel difficult today?", "What study methods do you already use?", "How should the plan behave?", "What should be in your first coverage set?", "Your first week is ready."][step];
  const stepDescription = ["This sets the direction. It is not a promise or a judgement.", "Use a normal school day, not your most ambitious day.", "Your answer becomes a starting estimate. Your real evidence will refine it.", "You do not need NotebookLM or any one tool. Choose what you actually use.", "The plan can be strict, flexible, quiet, or guided. You remain in control.", "Subjects stay compact; chapters can be opened later one subject at a time.", "Every day starts with one action, optional extra work, and a short close-the-loop check-in."][step];

  return <main className="onboarding-page adaptive-onboarding"><section className="onboarding-shell panel"><div className="onboarding-progress"><span>BUILD YOUR PERSONAL STUDY SYSTEM</span><b>Step {step + 1} of {steps.length}</b><i><strong style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></i><div className="onboarding-step-labels">{steps.map((label, index) => <span key={label} className={index <= step ? "active" : ""}>{label}</span>)}</div></div><section className="onboarding-step adaptive-step"><div className="onboarding-icon"><Sparkle weight="fill" /></div><small className="eyebrow">{steps[step].toUpperCase()}</small><h1>{stepTitle}</h1><p>{stepDescription}</p>{step === 0 && <div className="onboarding-fields"><label>Your name<input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="What should we call you?" /></label><label>Board<select value={board} onChange={(event) => setBoard(event.target.value)}><option>Dhaka</option><option>Chattogram</option><option>Rajshahi</option><option>Other</option></select></label><label>Exam year<input type="number" min="2025" max="2035" value={examYear} onChange={(event) => setExamYear(Number(event.target.value))} /></label><label>Target grade<select value={targetGrade} onChange={(event) => setTargetGrade(event.target.value)}><option>A+</option><option>A</option><option>B</option><option>Pass safely</option></select></label></div>}{step === 1 && <div className="onboarding-fields"><label>Weekday minutes<select value={weekdayMinutes} onChange={(event) => setWeekdayMinutes(Number(event.target.value))}><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option></select></label><label>Weekend minutes<select value={weekendMinutes} onChange={(event) => setWeekendMinutes(Number(event.target.value))}><option value="90">90 minutes</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option><option value="300">5 hours</option></select></label><label>Usual session length<select value={sessionLength} onChange={(event) => setSessionLength(Number(event.target.value))}><option value="25">25 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label><label>Sessions per day<select value={sessionsPerDay} onChange={(event) => setSessionsPerDay(Number(event.target.value))}><option value="1">1 session</option><option value="2">2 sessions</option><option value="3">3 sessions</option><option value="4">4 sessions</option></select></label></div>}{step === 2 && <div className="adaptive-subject-list">{subjects.map((subject) => { const assessment = assessments.find((item) => item.subjectId === subject.id) ?? defaultAssessment(profile.userId, subject.id); return <div className={`adaptive-subject-row ${selected.includes(subject.id) ? "selected" : ""}`} key={subject.id}><button type="button" className="subject-toggle" onClick={() => toggleSubject(subject.id)}><span>{selected.includes(subject.id) && <Check weight="bold" />}</span><strong>{subject.name}</strong></button><select value={assessment.startingPoint} onChange={(event) => updateAssessment(subject.id, { startingPoint: event.target.value as StartingPoint, difficulty: event.target.value === "difficult" ? 5 : event.target.value === "comfortable" ? 2 : 3 })}><option value="comfortable">Comfortable</option><option value="mixed">Mixed</option><option value="difficult">Difficult</option><option value="uncertain">Not sure yet</option></select><select value={assessment.priority} onChange={(event) => updateAssessment(subject.id, { priority: Number(event.target.value) as SubjectAssessment["priority"] })}><option value="1">Low priority</option><option value="3">Normal priority</option><option value="5">High priority</option></select></div>; })}</div>}{step === 3 && <div className="adaptive-method-grid">{methodOptions.map((method) => <button type="button" key={method.id} className={methods.includes(method.id) ? "selected" : ""} onClick={() => toggleMethod(method.id)}><strong>{method.label}</strong><small>{method.detail}</small>{methods.includes(method.id) && <Check weight="bold" />}</button>)}</div>}{step === 4 && <div className="adaptive-choice-grid"><button type="button" className={guidanceMode === "guided" ? "selected" : ""} onClick={() => setGuidanceMode("guided")}><Lightning weight="fill" /><strong>Guide me</strong><small>Tell me the next action and why.</small></button><button type="button" className={guidanceMode === "balanced" ? "selected" : ""} onClick={() => setGuidanceMode("balanced")}><Target weight="fill" /><strong>Keep it balanced</strong><small>Show priorities without over-directing me.</small></button><button type="button" className={guidanceMode === "quiet" ? "selected" : ""} onClick={() => setGuidanceMode("quiet")}><Clock weight="fill" /><strong>Keep it quiet</strong><small>Give me a queue; I will choose when.</small></button><label className="adaptive-wide-choice">Plan style<select value={strictness} onChange={(event) => setStrictness(event.target.value as LearningPreferences["planStrictness"])}><option value="flexible">Flexible — recover missed days calmly</option><option value="balanced">Balanced — keep a steady rhythm</option><option value="strict">Strict — protect my planned blocks</option></select></label></div>}{step === 5 && <div className="adaptive-coverage"><div className="coverage-summary"><strong>{selected.length} subjects selected</strong><span>Chapters stay closed until you open a subject in Goals.</span></div><div className="onboarding-subject-grid">{subjects.map((subject) => <button type="button" key={subject.id} className={selected.includes(subject.id) ? "selected" : ""} onClick={() => toggleSubject(subject.id)}><span>{selected.includes(subject.id) && <Check weight="bold" />}</span><strong>{subject.name}</strong><small>Set chapter coverage later</small></button>)}</div></div>}{step === 6 && <div className="adaptive-first-week"><article><span><PlayCircle weight="fill" /></span><div><strong>Do now</strong><p>{selected[0] ? currentSubject(selected[0])?.name : "Choose a subject"} · one {sessionLength}-minute starter session</p></div></article><article><span><GraduationCap weight="fill" /></span><div><strong>Every day</strong><p>Use your available minutes for one priority task, then choose optional practice if energy remains.</p></div></article><article><span><CheckCircle weight="fill" /></span><div><strong>Close the loop</strong><p>Record minutes, questions, confidence, and what felt too easy or too hard. The plan learns from that evidence.</p></div></article></div>}{error && <p className="form-error" role="alert">{error}</p>}</section><footer className="onboarding-actions"><Button variant="ghost" type="button" onClick={() => step > 0 && setStep(step - 1)} disabled={busy || step === 0}><ArrowLeft />Back</Button><button type="button" className="onboarding-skip" onClick={skip} disabled={busy}>Skip calibration</button>{step < 6 ? <Button className="solid-cta" type="button" onClick={next} disabled={busy || (step === 2 && selected.length === 0) || (step === 3 && methods.length === 0)}>{busy ? "Saving…" : "Save and continue"}<ArrowRight /></Button> : <Button className="solid-cta" type="button" onClick={finish} disabled={busy || selected.length === 0}>{busy ? "Building my plan…" : "Open my first week"}<ArrowRight /></Button>}</footer></section></main>;
}
