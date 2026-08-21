import { notFound } from "next/navigation";
const sections = [
  "home",
  "syllabus",
  "goals",
  "calendar",
  "journal",
  "progress",
  "exam-mode",
  "resources",
  "countdown",
  "exam-plan",
  "support",
  "settings",
] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function WorkspaceSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return null;
}
