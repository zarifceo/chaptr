"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, Flag, Gauge, GraduationCap, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Subject, UserProfile } from "@/lib/types";

type ProfilePatch = Partial<UserProfile>;

export function OnboardingWizard({ profile, subjects, save }: { profile: UserProfile; subjects: Subject[]; save: (patch: ProfilePatch) => Promise<void> }) {
  const [step, setStep] = useState(Math.min(3, Math.max(0, profile.onboardingStep)));
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [board, setBoard] = useState(profile.board || "Dhaka");
  const [examYear, setExamYear] = useState(profile.examYear || 2027);
  const [dailyTarget, setDailyTarget] = useState(profile.dailyTarget || 240);
  const [selected, setSelected] = useState<string[]>(profile.selectedSubjects.length ? profile.selectedSubjects : subjects.map((subject) => subject.id));
  const [busy, setBusy] = useState(false);

  const commit = async (patch: ProfilePatch) => {
    setBusy(true);
    await save(patch);
    setBusy(false);
  };

  const next = async () => {
    if (step === 0) { await commit({ displayName: displayName.trim() || undefined, onboardingStep: 1 }); setStep(1); return; }
    if (step === 1) { await commit({ selectedSubjects: selected, onboardingStep: 2 }); setStep(2); return; }
    await commit({ board, examYear, dailyTarget, onboardingStep: 3 }); setStep(3);
  };

  const finish = async () => {
    await commit({ displayName: displayName.trim() || undefined, board, examYear, dailyTarget, selectedSubjects: selected, onboardingStep: 7, onboardingCompleted: true });
  };

  const skip = async () => commit({ onboardingStep: 7, onboardingCompleted: true, selectedSubjects: selected });
  const toggleSubject = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <main className="onboarding-page"><section className="onboarding-shell panel"><div className="onboarding-progress"><span>SET UP YOUR WORKSPACE</span><b>Step {Math.min(step + 1, 3)} of 3</b><i><strong style={{ width: `${Math.max(8, Math.min(100, ((step + 1) / 3) * 100))}%` }} /></i></div>{step === 0 && <section className="onboarding-step"><div className="onboarding-icon"><Sparkle weight="fill" /></div><small className="eyebrow">A PRIVATE STUDY PLAN</small><h1>Let’s set up your starting point.</h1><p>This takes about two minutes. Your answers shape the first plan, and you can change them later.</p><label>What should we call you?<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" autoFocus /></label><div className="onboarding-note"><CheckCircle weight="fill" />Only you can see this workspace.</div></section>}{step === 1 && <section className="onboarding-step"><div className="onboarding-icon"><GraduationCap weight="fill" /></div><small className="eyebrow">CHOOSE YOUR SUBJECTS</small><h1>What are you preparing for?</h1><p>Keep the subjects you want in your study plan. You can add or remove them later from Goals.</p><div className="onboarding-subject-grid">{subjects.map((subject) => <button type="button" key={subject.id} className={selected.includes(subject.id) ? "selected" : ""} onClick={() => toggleSubject(subject.id)}><span>{selected.includes(subject.id) && <Check weight="bold" />}</span><strong>{subject.name}</strong><small>{subject.shortName}</small></button>)}</div><div className="onboarding-note"><CheckCircle weight="fill" />{selected.length} subject{selected.length === 1 ? "" : "s"} selected</div></section>}{step === 2 && <section className="onboarding-step"><div className="onboarding-icon"><Gauge weight="fill" /></div><small className="eyebrow">SET A REALISTIC TARGET</small><h1>How should your plan start?</h1><p>Use the target you can sustain on a normal school day—not your best day.</p><div className="onboarding-fields"><label>Board<select value={board} onChange={(event) => setBoard(event.target.value)}><option>Dhaka</option><option>Chattogram</option><option>Rajshahi</option><option>Other</option></select></label><label>Exam year<input type="number" min="2025" max="2035" value={examYear} onChange={(event) => setExamYear(Number(event.target.value))} /></label><label>Daily study target<select value={dailyTarget} onChange={(event) => setDailyTarget(Number(event.target.value))}><option value="90">90 minutes</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option><option value="300">5 hours</option></select></label></div><div className="onboarding-note"><Flag weight="fill" />You can change this in Settings at any time.</div></section>}{step === 3 && <section className="onboarding-step onboarding-complete"><div className="onboarding-icon success"><CheckCircle weight="fill" /></div><small className="eyebrow">YOUR STARTING POINT IS READY</small><h1>Start with one clear study action.</h1><p>Your workspace will open with {selected.length} subject{selected.length === 1 ? "" : "s"}, a {dailyTarget}-minute daily target, and the full chapter list ready for you to shape.</p><div className="onboarding-summary"><span><strong>{selected.length}</strong><small>Subjects</small></span><span><strong>{dailyTarget}m</strong><small>Daily target</small></span><span><strong>{examYear}</strong><small>Exam year</small></span></div></section>}<footer className="onboarding-actions"><Button variant="ghost" type="button" onClick={() => step > 0 && setStep(step - 1)} disabled={busy || step === 0}><ArrowLeft />Back</Button><button type="button" className="onboarding-skip" onClick={skip} disabled={busy}>Skip setup</button>{step < 3 ? <Button className="solid-cta" type="button" onClick={next} disabled={busy || (step === 1 && selected.length === 0)}>{busy ? "Saving…" : "Continue"}<ArrowRight /></Button> : <Button className="solid-cta" type="button" onClick={finish} disabled={busy}>{busy ? "Opening workspace…" : "Open my workspace"}<ArrowRight /></Button>}</footer></section></main>;
}
