import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · SSC Command Center",
  description: "Privacy Policy for SSC Command Center.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="SSC COMMAND CENTER · DATA PRACTICES"
      title="Privacy Policy"
      intro="This policy explains what SSC Command Center stores for your private study workspace and the controls available to you."
      updated="17 August 2026"
      sections={[
        {
          title: "1. What this policy covers",
          paragraphs: [
            "This policy applies to the SSC Command Center web application and the account and study information you enter into it. It does not cover third-party websites, question banks, calendar providers, or links that you choose to open from the application.",
          ],
        },
        {
          title: "2. Information you provide",
          paragraphs: [
            "When you create an account, the service may receive your email address, display name, authentication identifiers, and policy-consent records. During onboarding and normal use, you may choose to provide board, exam year, selected subjects, study targets, study windows, chapter progress, tasks, sessions, journal entries, mistakes, mock results, study resources, exam events, planning settings, and calendar-link information.",
            "You should avoid entering sensitive information that is not necessary for study planning, including passwords in notes, financial information, government identification numbers, or another person’s private information.",
          ],
        },
        {
          title: "3. How the information is used",
          paragraphs: [
            "The service uses account and study information to authenticate you, provide your private workspace, save and restore your study state, generate planning views, show analytics, support onboarding, and operate requested integrations such as calendar synchronization.",
            "The service is not designed to sell your study records or use them for advertising. Any future material change to this purpose should be reflected in an updated policy and, where required, a new consent choice.",
          ],
        },
        {
          title: "4. Storage and service providers",
          paragraphs: [
            "SSC Command Center is designed as a database-backed application. Authentication and application data are stored and processed through the configured Supabase project, while the web application is hosted through the configured deployment provider. These providers may process data as necessary to host, secure, authenticate, back up, and deliver the service.",
            "Access controls and row-level security are used to keep user-owned records associated with the authenticated account. No privacy or security measure can guarantee absolute protection, so you should use a strong unique password and protect access to your email account.",
          ],
        },
        {
          title: "5. Cookies and local browser storage",
          paragraphs: [
            "The application may use authentication cookies and other strictly necessary browser mechanisms to keep you signed in and protect requests. The product is intended to keep study state in the database rather than in localStorage, IndexedDB, offline queues, or service-worker caches.",
          ],
        },
        {
          title: "6. Sharing and disclosure",
          paragraphs: [
            "Your study workspace is intended to be private to your authenticated account. Information may be disclosed to service providers operating the application, when required to protect the service or its users, or when required by applicable law. If you connect an external integration, data necessary for that integration may be sent to that provider according to the provider’s own terms and privacy policy.",
          ],
        },
        {
          title: "7. Retention and deletion",
          paragraphs: [
            "The service keeps your account and study records while your account remains active or for as long as needed to provide the service and meet legitimate operational or legal requirements. You may request account or data deletion through the support contact made available by the service operator. Some records may remain temporarily in backups or where retention is legally required.",
          ],
        },
        {
          title: "8. Your choices",
          paragraphs: [
            "You may review and update profile and study information through the application. You may stop using optional integrations, change your password, request account access help, or request deletion through the available support channel. If you believe information about you is inaccurate, you may ask for it to be corrected.",
          ],
        },
        {
          title: "9. Children and student users",
          paragraphs: [
            "The service is intended for students preparing for examinations. If you are under the age required to consent to online services where you live, use the service only with the involvement and permission of a parent, guardian, or responsible adult where applicable.",
          ],
        },
        {
          title: "10. Changes and contact",
          paragraphs: [
            "This policy may be updated as the application, providers, or applicable requirements change. The displayed version date identifies the current draft. Questions, privacy requests, or deletion requests should be sent through the support contact published in the application or its project information.",
          ],
        },
      ]}
    />
  );
}
