"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarBlank, CheckCircle, PencilSimple, Plus, Target, Trash, X } from "@phosphor-icons/react";
import type { Chapter, ExamEvent, ExamEventKind, JournalEntry, StudyTask } from "@/lib/types";

type CountdownState = "upcoming" | "live" | "complete";
type Urgency = "runway" | "building" | "tight" | "critical";

const kindLabel: Record<ExamEventKind, string> = { official: "Official", school: "School test", mock: "Mock", custom: "Custom" };
const kindOptions: ExamEventKind[] = ["school", "mock", "custom"];
const dhakaDate = (value: string) => new Date(`${value}T00:00:00+06:00`);
const dateText = (value: string) => dhakaDate(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
const daysBetween = (start: number, end: number) => Math.ceil((start - end) / 86400000);

function stateOf(event: ExamEvent, now: number): CountdownState {
  const start = dhakaDate(event.start).getTime();
  const end = dhakaDate(event.end).getTime() + 86400000 - 1;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "complete";
}

function urgencyOf(days: number): Urgency {
  if (days <= 7) return "critical";
  if (days <= 30) return "tight";
  if (days <= 90) return "building";
  return "runway";
}

function countdownLabel(event: ExamEvent, now: number) {
  const state = stateOf(event, now);
  if (state === "live") return "In progress";
  if (state === "complete") return "Completed";
  const days = Math.max(0, daysBetween(dhakaDate(event.start).getTime(), now));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function eventScope(event: ExamEvent) {
  return event.scope.length ? event.scope : ["Scope not defined yet"];
}

export function ExamCountdownCenter({ events, saveEvents, chapters, tasks, entries, goToday }: { events: ExamEvent[]; saveEvents: (events: ExamEvent[]) => void; chapters: Chapter[]; tasks: StudyTask[]; entries: JournalEntry[]; goToday: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState<ExamEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(events.find((event) => event.kind === "official")?.id ?? events[0]?.id ?? "");
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(id); }, []);

  const ordered = useMemo(() => [...events].sort((a, b) => dhakaDate(a.start).getTime() - dhakaDate(b.start).getTime()), [events]);
  const live = ordered.find((event) => stateOf(event, now) === "live");
  const next = live ?? ordered.find((event) => stateOf(event, now) === "upcoming") ?? ordered[ordered.length - 1];
  const selected = events.find((event) => event.id === selectedId) ?? next;
  const official = events.find((event) => event.kind === "official") ?? next;
  const selectedState = selected ? stateOf(selected, now) : "upcoming";
  const daysToOfficial = official && stateOf(official, now) === "upcoming" ? Math.max(1, daysBetween(dhakaDate(official.start).getTime(), now)) : 0;
  const weeksToOfficial = Math.max(1, Math.ceil(daysToOfficial / 7));
  const ready = chapters.filter((chapter) => chapter.status === "exam-ready").length;
  const left = chapters.filter((chapter) => chapter.status !== "exam-ready").length;
  const focusedTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").length;
  const evidenceEntries = entries.length;
  const pace = Math.ceil(left / weeksToOfficial);
  const readiness = chapters.length ? Math.round(ready / chapters.length * 100) : 0;
  const todayMinutes = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").reduce((sum, task) => sum + task.duration, 0);
  const selectedDays = selected && selectedState === "upcoming" ? Math.max(0, daysBetween(dhakaDate(selected.start).getTime(), now)) : 0;
  const urgency = urgencyOf(selectedDays || 1);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (event: ExamEvent) => { setEditing(event); setSelectedId(event.id); setFormOpen(true); };
  const remove = (event: ExamEvent) => { if (event.locked) return; const nextEvents = events.filter((item) => item.id !== event.id); saveEvents(nextEvents); if (selectedId === event.id) setSelectedId(nextEvents[0]?.id ?? ""); };
  const save = (event: ExamEvent) => { const nextEvents = editing ? events.map((item) => item.id === editing.id ? event : item) : [...events, event]; saveEvents(nextEvents); setSelectedId(event.id); setEditing(null); setFormOpen(false); };

  return <main id="main-content" tabIndex={-1} className="page exam-countdown-page">
    <SectionTitle kicker="DEADLINES THAT CHANGE THE PLAN" title="Exam countdown command center"><button className="accent" onClick={openCreate}><Plus />Add exam</button></SectionTitle>
    <section className="countdown-command-hero">
      <div className="countdown-hero-copy"><small className="eyebrow">{live ? "LIVE EXAM WINDOW" : "NEXT HIGH-STAKES DEADLINE"}</small><h2>{next?.name ?? "Add your first exam"}</h2>{next && <p>{next.kind === "official" ? "Your main campaign anchor" : `${kindLabel[next.kind]} · ${dateText(next.start)}`}</p>}<div className="countdown-hero-number">{next ? countdownLabel(next, now) : "—"}</div>{next && <div className="countdown-hero-meta"><span><CalendarBlank />{dateText(next.start)}{next.end !== next.start ? ` — ${dateText(next.end)}` : ""}</span><span><Target />{eventScope(next)[0]}</span></div>}{next && stateOf(next, now) !== "complete" && <button className="solid-cta" onClick={goToday}>Build today around this deadline <ArrowRight /></button>}</div>
      <div className={`countdown-ring ${next ? urgencyOf(nextStateDays(next, now)) : "runway"}`}><strong>{next ? countdownLabel(next, now).split(" ")[0] : "0"}</strong><span>{next && stateOf(next, now) === "upcoming" ? "days left" : stateOf(next, now) === "live" ? "live now" : "closed"}</span></div>
    </section>
    <section className="countdown-stats"><article className="lilac"><small>SYLLABUS READINESS</small><strong>{readiness}%</strong><span>{ready} exam-ready · {left} still needing evidence</span></article><article className="mint"><small>PACE TO OFFICIAL EXAM</small><strong>{pace} chapters/week</strong><span>{daysToOfficial ? `${daysToOfficial} days · ${weeksToOfficial} weeks remaining` : "Official exam window is active or complete"}</span></article><article className="yellow"><small>TODAY&apos;S CAPACITY</small><strong>{todayMinutes} min</strong><span>{focusedTasks} open tasks in the current queue</span></article><article className="pink"><small>RECORDED EVIDENCE</small><strong>{evidenceEntries} journal entries</strong><span>Use sessions and mocks to strengthen proof</span></article></section>
    <section className="countdown-layout"><div className="panel countdown-timeline"><SectionTitle kicker="CAMPAIGN TIMELINE" title="Every deadline in one view" />{ordered.length ? ordered.map((event) => { const state = stateOf(event, now); const days = state === "upcoming" ? daysBetween(dhakaDate(event.start).getTime(), now) : 0; return <article className={`countdown-event-row ${state} ${selectedId === event.id ? "selected" : ""}`} key={event.id} onClick={() => setSelectedId(event.id)}><span className={`event-dot ${event.kind}`} /><div><small>{kindLabel[event.kind]} · {state === "upcoming" ? urgencyOf(days) : state}</small><strong>{event.name}</strong><p>{dateText(event.start)}{event.end !== event.start ? ` — ${dateText(event.end)}` : ""} · {event.scope[0] ?? "Scope not defined"}</p></div><b>{countdownLabel(event, now)}</b><div className="event-actions">{!event.locked && <><button onClick={(click) => { click.stopPropagation(); openEdit(event); }} aria-label={`Edit ${event.name}`}><PencilSimple /></button><button onClick={(click) => { click.stopPropagation(); remove(event); }} aria-label={`Delete ${event.name}`}><Trash /></button></>}</div></article>; }) : <div className="empty compact"><CalendarBlank /><h3>No exam dates yet.</h3><p>Add school tests, model tests, or any deadline that should change the plan.</p></div>}</div>
      <aside className="panel countdown-detail"><SectionTitle kicker="SELECTED DEADLINE" title={selected?.name ?? "No exam selected"} />{selected ? <><div className={`detail-status ${selectedState}`}><span>{selectedState === "live" ? "In progress" : selectedState === "complete" ? "Completed" : `${selectedDays} days remaining`}</span><b>{kindLabel[selected.kind]}</b></div><div className="detail-dates"><span>Starts<strong>{dateText(selected.start)}</strong></span><span>Ends<strong>{dateText(selected.end)}</strong></span></div><div className="detail-scope"><small>WHAT THIS DEADLINE COVERS</small>{eventScope(selected).map((scope) => <span key={scope}><CheckCircle weight="fill" />{scope}</span>)}</div>{selected.note && <p className="detail-note">{selected.note}</p>}{!selected.locked && <button className="secondary-action" onClick={() => openEdit(selected)}><PencilSimple />Edit deadline</button>}</> : <div className="feature-empty"><CalendarBlank /><p>Select or add an exam date to build its plan.</p></div>}</aside></section>
    <section className="panel countdown-guidance"><div><small className="eyebrow">HOW TO USE THE COUNTDOWN</small><h3>{selectedState === "live" ? "Protect exam-mode conditions now." : urgency === "critical" ? "Stop expanding the syllabus; close evidence gaps." : urgency === "tight" ? "Convert weak chapters into timed proof." : "Use the runway to build coverage before pressure rises."}</h3><p>{selectedState === "live" ? "Keep the queue focused on timed attempts, revision, and calm execution." : `${pace} chapters per week is the current minimum pace for the official campaign. Use the Today planner to turn that pace into scheduled work.`}</p></div><button className="accent" onClick={goToday}>Open adaptive planner <ArrowRight /></button></section>
    {formOpen && <ExamEventForm initial={editing} onClose={() => { setEditing(null); setFormOpen(false); }} onSave={save} />}
  </main>;
}

function nextStateDays(event: ExamEvent, now: number) { return stateOf(event, now) === "upcoming" ? Math.max(1, daysBetween(dhakaDate(event.start).getTime(), now)) : 1; }

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) { return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{children}</div>; }

function ExamEventForm({ initial, onClose, onSave }: { initial: ExamEvent | null; onClose: () => void; onSave: (event: ExamEvent) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? initial?.start ?? "");
  const [kind, setKind] = useState<ExamEventKind>(initial?.kind ?? "school");
  const [scope, setScope] = useState(initial?.scope.join(", ") ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!name.trim() || !start || !end || end < start) return; onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), start, end, kind, scope: scope.split(",").map((item) => item.trim()).filter(Boolean), note: note.trim() || undefined, locked: false }); };
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="exam-event-title"><button className="modal-scrim" onClick={onClose} aria-label="Close" /><form onSubmit={submit}><button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog"><X /></button><small>COUNTDOWN EVENT</small><h2 id="exam-event-title">{initial ? "Edit exam deadline" : "Add exam deadline"}</h2><p>Use this for school tests, model tests, or any date that should change your study pace.</p><div className="form-row"><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Half-yearly Mathematics" /></label><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as ExamEventKind)} disabled={Boolean(initial?.locked)}>{kindOptions.map((item) => <option value={item} key={item}>{kindLabel[item]}</option>)}</select></label></div><div className="form-row"><label>Start date<input required type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>End date<input required type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></label></div><label>Scope <input value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Maths Ch 1–9, Written paper" /><small>Separate scope items with commas.</small></label><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What should change in the plan before this date?" /></label><button className="solid-cta"><CheckCircle weight="fill" />Save countdown</button></form></div>;
}
