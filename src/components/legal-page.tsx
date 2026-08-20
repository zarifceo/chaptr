import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalPage({ eyebrow, title, intro, updated, sections }: LegalPageProps) {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-back" href="/auth"><ArrowLeft />Back to sign in</Link>
        <header className="legal-header">
          <div className="auth-mark"><Image src="/chaptr-logo.png" width={64} height={64} alt="Chaptr" /></div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-intro">{intro}</p>
          <p className="legal-updated">Last updated: {updated}</p>
        </header>
        <div className="legal-draft-notice">
          Working draft for the Chaptr product. A qualified attorney should review these policies before they are relied on as formal legal documents.
        </div>
        <article className="legal-content">
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </article>
        <footer className="legal-footer">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <span>Chaptr</span>
        </footer>
      </div>
    </main>
  );
}
