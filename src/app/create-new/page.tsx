import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";

export const metadata: Metadata = {
  title: "Create your Chaptr account",
  description: "Create your Chaptr account and start turning your syllabus into a plan.",
};

export default function CreateNewPage() {
  return <AuthScreen initialMode="sign-up" />;
}
