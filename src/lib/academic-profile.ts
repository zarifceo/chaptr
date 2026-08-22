import type { FourthSubject, ReligionSubject, StudyGroup, Subject, UserProfile } from "./types";

export const commonSubjectIds = ["bangla-1", "bangla-2", "english-1", "english-2", "mathematics", "ict"] as const;

export const groupSubjectIds: Record<StudyGroup, readonly string[]> = {
  science: ["physics", "chemistry", "biology", "bgs"],
  commerce: ["business", "finance", "accounting", "science"],
  humanities: ["geography", "economics", "history", "civics"],
};

export const religionSubjectIds: Record<ReligionSubject, string> = {
  islam: "islam",
  hinduism: "hinduism",
};

export const fourthSubjectIds: Record<FourthSubject, string> = {
  "higher-mathematics": "higher-mathematics",
  agriculture: "agriculture",
  "home-science": "home-science",
};

export const studyGroupOptions: Array<{ id: StudyGroup; label: string; detail: string }> = [
  { id: "science", label: "Science", detail: "Physics, Chemistry, Biology, and Bangladesh & Global Studies" },
  { id: "commerce", label: "Commerce", detail: "Business, Finance, Accounting, and General Science" },
  { id: "humanities", label: "Humanities / Arts", detail: "Geography, Economics, History, and Civics" },
];

export const religionOptions: Array<{ id: ReligionSubject; subjectId: string; label: string; banglaLabel: string }> = [
  { id: "islam", subjectId: "islam", label: "Islam and Moral Education", banglaLabel: "ইসলাম ও নৈতিক শিক্ষা" },
  { id: "hinduism", subjectId: "hinduism", label: "Hindu Religion and Moral Education", banglaLabel: "হিন্দুধর্ম ও নৈতিক শিক্ষা" },
];

export const fourthSubjectOptions: Array<{ id: FourthSubject; subjectId: string; label: string; detail: string }> = [
  { id: "higher-mathematics", subjectId: "higher-mathematics", label: "Higher Mathematics", detail: "Advanced mathematics and problem solving" },
  { id: "agriculture", subjectId: "agriculture", label: "Agriculture Studies", detail: "Agriculture, environment, and practical work" },
  { id: "home-science", subjectId: "home-science", label: "Home Science", detail: "Family, health, design, and practical life skills" },
];

export function subjectIdsForProfile(profile: Pick<UserProfile, "studyGroup" | "religionSubject" | "fourthSubject" | "selectedSubjects">) {
  if (!profile.studyGroup || !profile.religionSubject || !profile.fourthSubject) return profile.selectedSubjects;
  return [...commonSubjectIds, ...groupSubjectIds[profile.studyGroup], religionSubjectIds[profile.religionSubject], fourthSubjectIds[profile.fourthSubject]];
}

export function subjectsForProfile(allSubjects: Subject[], profile: Pick<UserProfile, "studyGroup" | "religionSubject" | "fourthSubject" | "selectedSubjects">) {
  const ids = new Set(subjectIdsForProfile(profile));
  return allSubjects.filter((subject) => ids.has(subject.id));
}

export function isAcademicProfileComplete(profile: Pick<UserProfile, "studyGroup" | "religionSubject" | "fourthSubject" | "academicProfileCompleted">) {
  return Boolean(profile.academicProfileCompleted && profile.studyGroup && profile.religionSubject && profile.fourthSubject);
}
