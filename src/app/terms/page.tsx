import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service · SSC Command Center",
  description: "Terms of Service for SSC Command Center.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="SSC COMMAND CENTER · ACCOUNT TERMS"
      title="Terms of Service"
      intro="These terms explain how SSC Command Center may be used as a private study-planning workspace for SSC 2027 preparation."
      updated="17 August 2026"
      sections={[
        {
          title: "1. The service",
          paragraphs: [
            "SSC Command Center is a personal study-planning and progress-tracking tool. It helps you organize subjects, chapters, study sessions, tasks, journal entries, mistakes, resources, exam events, and related planning information.",
            "The service is not an official examination authority, coaching provider, textbook publisher, or substitute for the instructions issued by your school, education board, or examination authority.",
          ],
        },
        {
          title: "2. Your account",
          paragraphs: [
            "You are responsible for providing accurate account information, keeping your password confidential, and notifying the service operator if you believe your account has been accessed without permission.",
            "Each person should use their own account. Your workspace is intended to remain private to your authenticated account, subject to the technical operation of the service and its hosting providers.",
          ],
        },
        {
          title: "3. Acceptable use",
          paragraphs: [
            "You may use the service for lawful personal study planning and related educational organization. You must not attempt to access another person’s workspace, bypass authentication or security controls, interfere with the service, upload malicious material, or use the service to violate another person’s rights.",
            "You remain responsible for the content you enter, including notes, links, journal entries, and study materials. Do not upload information that you do not have the right to store or that you would not want associated with your account.",
          ],
        },
        {
          title: "4. Educational information",
          paragraphs: [
            "Study recommendations, chapter priorities, analytics, reminders, and planning suggestions are organizational aids. They may be incomplete or unsuitable for your circumstances. Always compare important academic decisions with your syllabus, teachers, official board guidance, and current examination notices.",
          ],
        },
        {
          title: "5. Availability and changes",
          paragraphs: [
            "The service may change, pause, or become unavailable for maintenance, security, hosting, or other operational reasons. Features may be added, removed, or revised as the product develops.",
            "We may update these terms when the service or applicable requirements change. The version you accept will be recorded with your account where the product supports versioned consent.",
          ],
        },
        {
          title: "6. Account closure and data",
          paragraphs: [
            "You may stop using the service at any time. Requests to delete an account or associated data should be made through the support channel published by the service operator. Deletion may be subject to reasonable identity verification and technical or legal retention requirements.",
          ],
        },
        {
          title: "7. No warranty; limitation of responsibility",
          paragraphs: [
            "The service is provided as a study tool and is not guaranteed to be error-free, continuously available, or sufficient for any particular examination outcome. To the extent permitted by applicable law, the service operator is not responsible for decisions made solely from automated planning suggestions or for losses caused by misuse of the service or failure to protect account credentials.",
          ],
        },
        {
          title: "8. Contact",
          paragraphs: [
            "Questions about these terms, account access, or deletion requests should be sent through the support contact made available in the application or its published project information.",
          ],
        },
      ]}
    />
  );
}
