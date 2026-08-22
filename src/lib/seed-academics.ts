import { createHash } from "node:crypto";
import { chapters, exams, marksDistributions, subjects, workflowSteps } from "@/lib/academic-data";
import { mathsFormulaSeeds } from "@/lib/maths-formula-data";
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
    category: subject.category ?? "common",
    study_group: subject.studyGroup ?? null,
    religion_subject: subject.religionSubject ?? null,
    fourth_subject: subject.fourthSubject ?? null,
    book_language: "bn",
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
  const markRowsWithoutPart = markRows.filter((mark) => mark.part === null);
  const markRowsWithPart = markRows.filter((mark) => mark.part !== null);
  const workflowRows = Object.entries(workflowSteps).map(([workflow_kind, steps]) => ({ workflow_kind, steps: [...steps] }));
  const formulaRows = mathsFormulaSeeds.map((formula) => ({
    id: stableUuid(["maths-formula", formula.division, formula.chapterTitle ?? "", formula.title].join("|")),
    subject_id: "mathematics",
    chapter_id: formula.chapterTitle ? chapters.find((chapter) => chapter.title === formula.chapterTitle)?.id ?? null : null,
    division: formula.division,
    title: formula.title,
    expression: formula.expression,
    explanation: formula.explanation,
    tags: formula.tags,
    sort_order: formula.sortOrder,
  }));
  const examRows = exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    starts_on: exam.start,
    ends_on: exam.end,
    stage: exam.id === "test" ? "test-exam" : "ssc-exam",
    syllabus_scope: "Complete SSC syllabus",
  }));
  const textbookRows = [
    ["nctb-2026-bangla-literature", "bangla-1", "বাংলা সাহিত্য", "https://drive.google.com/file/d/1yjdxHcyFeQLBKLD8tykuqGABh_CaCXIn/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/bspYlB4Rwd4VFUM", 10],
    ["nctb-2026-bangla-companion", "bangla-1", "বাংলা সহপাঠ", "https://drive.google.com/file/d/1NqVcm3tt4olBGRPqi_tVksF__yknMNL8/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/DJ6TEuMohVdTuht", 20],
    ["nctb-2026-bangla-grammar", "bangla-2", "বাংলা ভাষার ব্যাকরণ ও নির্মিতি", "https://drive.google.com/file/d/1yqoG73PYj6F8xlB-WTNfGSUk9Yf1z_tR/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/z7CNJUJAw9UuPv5", 30],
    ["nctb-2026-english-today", "english-1", "English For Today", "https://drive.google.com/file/d/119HUFSrDZ9GrG_cLGAgVVzM4XMPkA_1g/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/CobRtJNoc1ISrGv", 40],
    ["nctb-2026-english-grammar", "english-2", "English Grammar and Composition", "https://drive.google.com/file/d/1bcIWidHEPsNpwx4Q9EXHdCbFA6HBQWbr/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/6cNd5kYL7lbK62r", 50],
    ["nctb-2026-mathematics", "mathematics", "গণিত", "https://drive.google.com/file/d/1-Dj-9Y1Q79AWN7fViMR8fj4jvzDVNYYl/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/HwrCrAtDhb9K484", 60],
    ["nctb-2026-ict", "ict", "তথ্য ও যোগাযোগ প্রযুক্তি", "https://drive.google.com/file/d/1jgAhqSmR6zXZzcSr0fpkWbcw3_07pPGe/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/PjriLZ5LTTdrkDc", 70],
    ["nctb-2026-science", "science", "বিজ্ঞান", "https://drive.google.com/file/d/1AYg7uY_WjVYJmoskhb0-D58iFPvgwmpJ/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/NupFtnqI21e6svU", 80],
    ["nctb-2026-agriculture", "agriculture", "কৃষিশিক্ষা", "https://drive.google.com/file/d/1vcbOBJYqqH9RrWM7q1FTSAWkFwhrhSwj/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/WlPU0WZt9GuN5mR", 90],
    ["nctb-2026-accounting", "accounting", "হিসাববিজ্ঞান", "https://drive.google.com/file/d/1rdxqp5pbj4L_YOARjByJQm4YH8WhYm-D/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/IxTLwFRfjGP6AO4", 100],
    ["nctb-2026-finance", "finance", "ফিন্যান্স ও ব্যাংকিং", "https://drive.google.com/file/d/1mTSzCxZWjbmGZQWaiwV6y0Y170pwrNDD/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/hMQenv7qpYI7A9k", 110],
    ["nctb-2026-business", "business", "ব্যবসায় উদ্যোগ", "https://drive.google.com/file/d/1eR_R_nf_GGgeDvRPiSeZa35o1gOtSO-3/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/ZSSo3l4WrIIuMZW", 120],
    ["nctb-2026-islam", "islam", "ইসলাম ও নৈতিক শিক্ষা", "https://drive.google.com/file/d/1-2tcr1JJFEB56yOlVhqRpssKJOIaXNM6/view?usp=drive_link", "https://drive.egovcloud.gov.bd/index.php/s/P4DQEn2UadaVBjS", 130],
    ["nctb-2026-physics", "physics", "পদার্থবিজ্ঞান", "https://drive.google.com/file/d/13P5E08HcNbpALj8-aC-RUCy0d3iwodet/view?usp=drive_link", null, 140],
    ["nctb-2026-chemistry", "chemistry", "রসায়ন", "https://drive.google.com/file/d/1lbgge3uWpQmuHOBvzLJ4AuPP2Na1RYQ8/view?usp=drive_link", null, 150],
    ["nctb-2026-biology", "biology", "জীববিজ্ঞান", "https://drive.google.com/file/d/11WRMSWpqi4KtgxClDCBXely2XdiAhoju/view?usp=drive_link", null, 160],
    ["nctb-2026-higher-mathematics", "higher-mathematics", "উচ্চতর গণিত", "https://drive.google.com/file/d/18osCGwa0nHp-q3XgkjEFcoBqteORdiXE/view?usp=drive_link", null, 170],
    ["nctb-2026-geography", "geography", "ভূগোল ও পরিবেশ", "https://drive.google.com/file/d/1IBxZA_tZ8Ayhcm0s7IAOXaju0iFt2Xsc/view?usp=drive_link", null, 180],
    ["nctb-2026-economics", "economics", "অর্থনীতি", "https://drive.google.com/file/d/1pr8PKw5S_eBcmwzBMmIzmsuqfjTX0iTo/view?usp=drive_link", null, 190],
    ["nctb-2026-history", "history", "বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা", "https://drive.google.com/file/d/1fIva2037ZxRmu3kZRgRevoWt18yBo_22/view?usp=drive_link", null, 200],
    ["nctb-2026-civics", "civics", "পৌরনীতি ও নাগরিকতা", "https://drive.google.com/file/d/1h5OQIDlC4TuOQjbaqlTVXa7QKUhAAAla/view?usp=drive_link", null, 210],
    ["nctb-2026-bgs", "bgs", "বাংলাদেশ ও বিশ্বপরিচয়", "https://drive.google.com/file/d/1y8nVlBXO8JA7yCVka_kaf2xFQZl5alS2/view?usp=drive_link", null, 220],
    ["nctb-2026-hinduism", "hinduism", "হিন্দুধর্ম ও নৈতিক শিক্ষা", "https://drive.google.com/file/d/1hoqjWrhNdcWEcOmzX5x9-g9Zeav85RTl/view?usp=drive_link", null, 230],
    ["nctb-2026-home-science", "home-science", "গার্হস্থ্যবিজ্ঞান", "https://drive.google.com/file/d/1RaKjS79_GO6mP3nZ8fLTyqFa5s5fBdMm/view?usp=drive_link", null, 260],
  ].map(([id, subject_id, title, url, alternate_url, sort_order]) => ({ id: String(id), subject_id: String(subject_id), title: String(title), board: "NCTB", academic_year: 2026, language: "bn", url: String(url), alternate_url: alternate_url ? String(alternate_url) : null, source_page: "https://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612", source_label: "NCTB 2026 official textbook list", note: "Bangla-version Class 9–10 textbook.", sort_order: Number(sort_order), active: true }));

  const { error: subjectError } = await admin.from("subjects").upsert(subjectRows);
  if (subjectError) throw new Error(`Could not seed subjects: ${subjectError.message}`);

  const results = await Promise.all([
    admin.from("chapters").upsert(chapterRows),
    admin.from("marks_distributions").upsert(markRowsWithoutPart),
    admin.from("marks_distributions").upsert(markRowsWithPart, {
      onConflict: "subject_id,part,question_type",
    }),
    admin.from("workflow_steps").upsert(workflowRows),
    admin.from("exams").upsert(examRows),
    admin.from("curated_textbooks").upsert(textbookRows),
  ]);

  const tables = [
    "chapters",
    "marks_distributions without parts",
    "marks_distributions with parts",
    "workflow_steps",
    "exams",
    "curated_textbooks",
  ] as const;
  results.forEach(({ error }, index) => {
    if (error) throw new Error(`Could not seed ${tables[index]}: ${error.message}`);
  });
  const { error: formulaError } = await admin.from("maths_formulas").upsert(formulaRows);
  if (formulaError) throw new Error(`Could not seed maths_formulas: ${formulaError.message}`);
}

export function ensureAcademicData() {
  seedPromise ??= runSeed().catch((error) => {
    seedPromise = null;
    console.error(error);
  });
  return seedPromise;
}
