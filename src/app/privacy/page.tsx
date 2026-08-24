import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { POLICY_PUBLISHED_DATE } from "@/lib/policy-config";

export const metadata: Metadata = {
  title: "Privacy Policy · Chaptr",
  description: "Privacy Policy for Chaptr.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="CHAPTR · DATA PRACTICES"
      title="Privacy Policy"
      intro="This Privacy Policy explains what Chaptr collects, how it is used, and the controls available for your private SSC 2027 study workspace."
      updated={POLICY_PUBLISHED_DATE}
      sections={[
        {
          title: "1. Scope",
          paragraphs: [
            "This policy applies to the Chaptr web application, the Chaptr account used to sign in, and the account and study information handled through the service. It does not apply to third-party websites, question banks, videos, guidebooks, textbook links, or other external services that you choose to open from Chaptr. Those services have their own privacy practices.",
          ],
        },
        {
          title: "2. Information you provide",
          paragraphs: [
            "When you create or use an account, Chaptr may receive your email address, display name, authentication identifier, sign-in provider information, email-verification state, password-reset activity, and records showing acceptance of the Terms of Service and Privacy Policy. You may create an account with email and password or use the available Google sign-in option.",
            "During onboarding and normal use, you may provide your board, SSC 2027 study profile, selected subjects, subject strengths, difficult-subject selection, subject and chapter priorities, chapter difficulty and progress, goals, tasks, task workflows, weekday and weekend study capacity, preferred focus-block length, focused study sessions, pause and resume state, exam sessions, MCQ/CQ/SQ results, journal entries, mistakes, mock results, study resources, uploaded files, saved links, in-app exam events, exam-plan phases, planning settings, workflow presets, recommendation feedback, and related timestamps.",
            "If you contact Support, Chaptr may receive the category of your request, the page or feature involved, your description, expected behavior, and the resulting support history. Diagnostic details are optional and limited to the route, viewport, browser family, app version, and time shown in the Support form. Chaptr does not require sensitive personal information for ordinary study planning.",
          ],
        },
        {
          title: "3. Information handled by authentication and infrastructure providers",
          paragraphs: [
            "Authentication, hosting, database, and file-storage providers may process information needed to sign you in, maintain secure sessions, host the application, store your records, deliver uploaded resources, prevent abuse, troubleshoot failures, and maintain backups. These providers may also create technical security logs such as request, device, browser, or network information according to their own policies and the configuration used to operate Chaptr.",
            "Chaptr currently uses Supabase for authentication, database-backed application records, row-level access controls, and private uploaded-resource storage, and uses its configured hosting and deployment provider to deliver the web application. Provider processing is limited by the services they perform for the application and by their applicable terms and policies.",
          ],
        },
        {
          title: "4. How Chaptr uses information",
          paragraphs: [
            "Chaptr uses account information to authenticate you, create and maintain your private workspace, restore your study state, and communicate account or security events. It uses study information to display your syllabus, track chapter progress, organize tasks and sessions, run exam and calendar views, calculate study analytics, and save your journals, mistakes, resources, and results.",
            "Chaptr uses the preferences and evidence you provide—such as subject strength, priority, difficulty, preferred study methods, daily study capacity, chapter status, mistakes, mock results, and feedback—to generate recommendations, adaptive plans, and study workflows. Mathematical subjects may receive phase-based workflows, but the planner does not use a hidden subject-specific schedule or treat one subject as universally more important than another.",
            "Chaptr is not designed to sell your study records or use them for behavioral advertising. The current service does not connect to Google Calendar or another external calendar provider; exam events and planning calendars are maintained inside Chaptr.",
          ],
        },
        {
          title: "5. Uploaded resources and saved links",
          paragraphs: [
            "If you upload a study file, Chaptr stores it in private user-scoped storage and keeps the associated title, file type, size, chapter, note, and storage reference needed to show it in your workspace. The current upload interface accepts supported document, image, and text formats up to 25 MB per file, subject to an account storage quota. When you open an uploaded file, Chaptr may issue a temporary signed access URL that expires after a limited period.",
            "If you save a URL, Chaptr stores the link and the study context you attach to it. Opening that link takes you to a third-party destination. Chaptr does not control the privacy, security, availability, or content of that destination.",
          ],
        },
        {
          title: "6. Cookies and browser technologies",
          paragraphs: [
            "Chaptr uses authentication and session cookies, along with other strictly necessary browser mechanisms, to keep you signed in, protect requests, and maintain the application experience. The current product does not describe or use advertising cookies for behavioral advertising. Your browser, authentication provider, and hosting provider may use additional technical mechanisms under their own policies.",
          ],
        },
        {
          title: "7. Sharing and disclosure",
          paragraphs: [
            "Your study workspace is intended to be private to your authenticated account. Chaptr may disclose information to the authentication, hosting, database, file-storage, security, and support infrastructure providers that operate the service; when needed to protect Chaptr, its users, or the public; when you direct Chaptr to open or use a third-party link; or when required by law, legal process, or a valid governmental request.",
            "Chaptr does not currently send your study workspace to an external calendar service. If a future feature materially changes how information is shared, Chaptr will update this policy and, where required, ask for a new consent choice.",
          ],
        },
        {
          title: "8. Security",
          paragraphs: [
            "Chaptr uses authenticated access controls and database row-level security to associate user-owned records with the signed-in account. Uploaded resources are stored in private user-scoped storage rather than presented as public files. No online service can guarantee absolute security, so use a strong unique password, protect your email account, and avoid placing secrets or unnecessary sensitive information in your study content.",
          ],
        },
        {
          title: "9. Retention and account deletion",
          paragraphs: [
            "Chaptr keeps account and study information while your account is active or while it is reasonably needed to provide the service, maintain security, resolve support matters, or meet applicable legal and operational requirements. You can request account deletion from Support after verifying your identity and typing the required confirmation phrase.",
            "A verified deletion request starts a 14-day grace period. Signing in again during that period automatically cancels the request. After the grace period, deletion processing may remove the Chaptr account and owned study records, including profile, tasks, chapter progress, journals, resources, planning data, exam events, and support history, subject to technical processing time, backups, security records, or information that must be retained by law.",
          ],
        },
        {
          title: "10. Your choices and requests",
          paragraphs: [
            "You may review and update profile and study information through Chaptr, change your password where applicable, choose your study methods and planning settings, remove saved resources, and adjust recommendation feedback. You may contact Support to request help with account access, correction of inaccurate information, privacy questions, or account deletion.",
            "Support requests are scoped to the signed-in account. Chaptr may ask for reasonable verification before providing account-specific information or processing a deletion request.",
          ],
        },
        {
          title: "11. Student users",
          paragraphs: [
            "Chaptr is intended for students preparing for examinations. If you are below the age at which you can consent to online services where you live, use Chaptr with the involvement and permission of a parent, guardian, or other responsible adult as required by applicable law. Do not enter another student’s private information or information that is not needed for your study workspace.",
          ],
        },
        {
          title: "12. Changes and contact",
          paragraphs: [
            "Chaptr may update this policy when the product, providers, or applicable requirements change. The current version and last-updated date are published on this page. Material changes will be reflected in the product’s policy-consent flow where a new consent choice is required.",
            "For privacy questions, correction requests, account access, or deletion requests, use the authenticated Support section in Chaptr.",
          ],
        },
      ]}
    />
  );
}
