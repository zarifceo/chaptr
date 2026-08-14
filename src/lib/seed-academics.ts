import { createHash } from "node:crypto";
import { chapters, exams, marksDistributions, subjects } from "@/lib/academic-data";
import { createAdminClient } from "@/lib/supabase/admin";

let seedPromise: Promise<void> | null = null;

function stableUuid(value: string) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const id = hex.join("");
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function runSeed() {
  const admin = createAdminClient();
  if (!admin) return;

  const subjectRows = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    short_name: subject.shortName,
    strength_level: subject.strength,
    priority: subject.weaknessScore,
    maintenance_target: subject.strength === "strongest" ? 2 : 1,
    workflow_kind: subject.workflow,
  }));
  const chapterRows = chapters.map((chapter) => ({
    id: chapter.id,
    subject_id: chapter.subjectId,
    chapter_number: chapter.number ?? null,
    title: chapter.title,
    division: chapter.division ?? null,
    note: chapter.note ?? null,
    question_formats: chapter.formats,
    syllabus_eligible: true,
  }));
  const markRows = marksDistributions.map((mark) => ({
    id: stableUuid([mark.subjectId, mark.part ?? "", mark.questionType].join("|")),
    subject_id: mark.subjectId,
    part: mark.part ?? null,
    question_type: mark.questionType,
    choice_rule: mark.rule,
    marks: mark.marks,
  }));
  const examRows = exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    starts_on: exam.start,
    ends_on: exam.end,
    stage: exam.id === "test" ? "test-exam" : "ssc-exam",
    syllabus_scope: "Complete SSC syllabus",
  }));

  const results = await Promise.all([
    admin.from("subjects").upsert(subjectRows),
    admin.from("chapters").upsert(chapterRows),
    admin.from("marks_distributions").upsert(markRows),
    admin.from("exams").upsert(examRows),
  ]);

  const tables = ["subjects", "chapters", "marks_distributions", "exams"] as const;
  results.forEach(({ error }, index) => {
    if (error) throw new Error(`Could not seed ${tables[index]}: ${error.message}`);
  });
}

export function ensureAcademicData() {
  seedPromise ??= runSeed().catch((error) => {
    seedPromise = null;
    console.error(error);
  });
  return seedPromise;
}
