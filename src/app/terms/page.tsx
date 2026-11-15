import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { POLICY_PUBLISHED_DATE } from "@/lib/policy-config";

export const metadata: Metadata = {
  title: "Terms of Service · Chaptr",
  description: "Terms of Service for Chaptr.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="CHAPTR · ACCOUNT TERMS"
      title="Terms of Service"
      intro="These Terms of Service govern your use of Chaptr, a private study-planning workspace for SSC 2027 preparation."
      updated={POLICY_PUBLISHED_DATE}
      sections={[
        {
          title: "1. About Chaptr",
          paragraphs: [
            "Chaptr helps students organize an SSC 2027 study programme. The service can store and display subjects, chapters, chapter status, subject strengths and priorities, daily study capacity, tasks, multi-step workflows, focused study sessions, exam sessions, journal entries, mistakes, mock results, study resources, in-app exam events, exam-plan phases, and planning summaries.",
            "Chaptr is an organizational and learning-support tool. It is not an official education board, examination authority, school, tutor, coaching provider, textbook publisher, or replacement for instructions from your school, teachers, NCTB, or the relevant examination authority. The exam year supported by the service is fixed to SSC 2027.",
          ],
        },
        {
          title: "2. Eligibility and accounts",
          paragraphs: [
            "You may use Chaptr only if you can lawfully agree to these terms. Chaptr is designed for students. If you are below the age at which you can consent to online services where you live, use Chaptr with the involvement and permission of a parent, guardian, or other responsible adult as required by applicable law.",
            "You may create an account with an email address and password or use the available Google sign-in option. You are responsible for providing accurate information, keeping your authentication details secure, and promptly reporting suspected unauthorized access. Do not share your account or use another person’s account.",
          ],
        },
        {
          title: "3. Your study content",
          paragraphs: [
            "You keep your rights in the information and materials you submit to Chaptr, including notes, journal entries, task instructions, links, uploaded study files, and other study content. You give Chaptr the limited permission needed to store, process, display, secure, and make that content available to you through the service.",
            "You must have the right to submit any content you enter or upload. Do not upload malware, passwords, payment information, government identification numbers, another person’s private information, or copyrighted material that you are not permitted to store. You are responsible for checking links and materials you add to your workspace.",
          ],
        },
        {
          title: "4. Acceptable use",
          paragraphs: [
            "You may use Chaptr for lawful personal study planning and related educational organization. You must not attempt to access another user’s records, bypass authentication or row-level security, probe or interfere with the application or its infrastructure, submit malicious code, overload the service, impersonate another person, or use Chaptr to violate the rights or privacy of another person.",
            "Chaptr may restrict or suspend access when reasonably necessary to protect users, the service, or its infrastructure, investigate misuse, comply with law, or address a security risk. Where appropriate, Chaptr will provide a clear path for account or support questions.",
          ],
        },
        {
          title: "5. Planning recommendations and study workflows",
          paragraphs: [
            "Chaptr uses the information and evidence you provide, including chapter progress, difficulty, subject strength, priority, preferred study methods, weekday and weekend study capacity, mistakes, mock results, and feedback, to generate planning suggestions and study workflows. All subjects are eligible for the same planning system; some mathematical subjects may receive a multi-stage workflow because their study commonly involves explanation, formulas, exercises, MCQs, and board-question practice.",
            "Recommendations, priorities, timers, analytics, task durations, and reminders are aids rather than guarantees. They may be incomplete, incorrect, or unsuitable for your circumstances. You remain responsible for choosing what to study and for verifying important academic information against your current syllabus, teachers, official textbooks, and examination notices. Chaptr does not guarantee a particular grade, result, admission outcome, or examination performance.",
          ],
        },
        {
          title: "6. Resources and external links",
          paragraphs: [
            "Chaptr may let you save links, upload study resources, and open curated or user-added materials. The current service does not connect to Google Calendar or another external calendar provider; calendar and exam-event planning takes place inside Chaptr. External websites, links, textbooks, question banks, videos, guidebooks, and other third-party materials are controlled by their respective providers and may have separate terms and privacy policies.",
            "Chaptr does not guarantee that an external link, uploaded file, third-party explanation, or curated resource is available, accurate, complete, current, or suitable for your course. Review external materials before relying on them.",
          ],
        },
        {
          title: "7. Open-source software and intellectual property",
          paragraphs: [
            "Chaptr’s application source code is open-source software released under the MIT License and available in the public Chaptr GitHub repository. Your rights to inspect, copy, modify, or self-host the source code are governed by the MIT License included with the repository.",
            "These Terms of Service govern your use of the hosted Chaptr service and student accounts. The Chaptr name, logo, and brand assets remain the property of Chaptr and its maintainers; using the hosted service does not transfer ownership of Chaptr’s trademarks or branding to you.",
          ],
        },
        {
          title: "8. Availability and changes",
          paragraphs: [
            "Chaptr may be unavailable from time to time because of maintenance, security work, provider outages, network conditions, or other operational reasons. The service is provided without a guaranteed uptime or response-time commitment. Features, supported data fields, study workflows, and interface behavior may change as the product develops.",
            "Chaptr may update these terms when the service, providers, or applicable requirements change. The current version and its last-updated date are published on this page. If the product requires a new consent choice for a material change, the account flow will request it.",
          ],
        },
        {
          title: "9. Account closure and deletion",
          paragraphs: [
            "You may stop using Chaptr at any time and may request account deletion from the Support section. A verified deletion request requires identity verification and the exact confirmation phrase shown in the application. It starts a 14-day grace period, during which signing in again automatically cancels the request. After the grace period, deletion processing may remove your Chaptr account and owned study records, subject to technical, security, backup, or legal retention requirements.",
          ],
        },
        {
          title: "10. Disclaimers and limitation of responsibility",
          paragraphs: [
            "To the extent permitted by applicable law, Chaptr is provided on an as-available basis without warranties that it will be uninterrupted, error-free, secure in every circumstance, or sufficient for a particular academic objective. You should maintain your own important copies of study materials and should not rely on Chaptr as the only copy of information you need for an examination.",
            "To the extent permitted by applicable law, Chaptr is not responsible for academic decisions made from a recommendation, loss caused by misuse of the service, failure to protect account credentials, third-party content, unavailable external links, or provider and network failures outside Chaptr’s reasonable control. Nothing in these terms limits a right or remedy that cannot lawfully be limited.",
          ],
        },
        {
          title: "11. Contact",
          paragraphs: [
            "For questions about these terms, account access, privacy, support, or deletion, use the authenticated Support section in Chaptr. Support requests and deletion requests are tied to the signed-in account so that account-specific information can be handled securely.",
          ],
        },
      ]}
    />
  );
}
