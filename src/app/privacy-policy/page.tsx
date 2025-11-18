import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

const LAST_UPDATED = 'May 30, 2024';

type Section = {
  title: string;
  body: ReactNode[];
  bullets?: { lead?: string; text: string }[];
  note?: string;
};

const SECTIONS: Section[] = [
  {
    title: 'What this policy covers',
    body: [
      'Chess Analyzer is a browser-based chess workspace. We do not require accounts, and most computations (engine evaluation, move history, and PGN storage) happen directly in your browser. This policy explains what limited information we process, why we process it, and the choices that are available to you.',
    ],
  },
  {
    title: 'Data we process',
    body: [
      'We only collect the information that is necessary to operate and protect the service. The primary categories are:',
    ],
    bullets: [
      {
        lead: 'Local chess data.',
        text: 'Games you paste or import are stored in your browser using IndexedDB so you can revisit, analyze, or continue them later. We do not send these PGNs to our servers unless you explicitly choose to share them with someone else.',
      },
      {
        lead: 'Telemetry events.',
        text: 'We log high-level, non-personal events such as "analysis_opened" or "engine_failed" so we can debug performance and reliability. Telemetry payloads may include coarse device metadata (browser, OS, approximate timestamp) but never PGN content or personally identifying information.',
      },
      {
        lead: 'Contact information you send to us.',
        text: 'If you email our support address we will obviously receive your email address and any details you include in that message. We use that information solely for responding to you.',
      },
    ],
  },
  {
    title: 'Cookies, storage, and analytics',
    body: [
      'Chess Analyzer stores small configuration values (such as board appearance, theme, and cached opening indexes) in localStorage or IndexedDB so the site loads faster on your next visit. We also rely on sessionStorage to buffer telemetry events in case the browser is offline. Clearing your browser data removes all of these records.',
      'We currently use Google Analytics and Microsoft Clarity to understand aggregate usage patterns. These tools set their own cookies and respect the privacy controls provided by your browser. We review analytics in aggregate form only and do not attempt to re-identify individuals.',
    ],
  },
  {
    title: 'Sharing and third parties',
    body: [
      'We share information only with the infrastructure vendors that help us run Chess Analyzer:',
    ],
    bullets: [
      {
        lead: 'Vercel and Cloudflare.',
        text: 'We deploy our Next.js frontend to Vercel and host engine assets on Cloudflare R2. These providers process network-level logs (IP address, user agent, requested path) for security and reliability purposes.',
      },
      {
        lead: 'Discord community integrations.',
        text: 'If you join our Discord server you will be subject to Discord\'s own terms and privacy practices. Participation there is optional and separate from the core product.',
      },
      {
        lead: 'Open-source dependencies.',
        text: 'We embed the Stockfish engine and other third-party libraries locally in your browser. These packages do not receive your data unless you build and run modified versions yourself.',
      },
    ],
  },
  {
    title: 'Data retention and deletion',
    body: [
      'Local data such as PGNs, cached indexes, or board preferences are saved on your device until you delete them. You can remove them at any time by clearing your browser storage or using the "Reset data" controls where provided. Telemetry logs stored on our servers are retained for up to 90 days before they are aggregated or deleted.',
    ],
  },
  {
    title: 'Your choices',
    bullets: [
      {
        lead: 'Use Chess Analyzer without an account.',
        text: 'You can access nearly every feature anonymously. If you prefer, you may block analytics or telemetry using your browser or network settings; doing so will not break the core experience.',
      },
      {
        lead: 'Control the data stored on your device.',
        text: 'All PGNs and cached evaluation data remain on your computer. Removing them is as simple as clearing site data in your browser settings.',
      },
      {
        lead: 'Contact us for support or deletion requests.',
        text: 'While we generally do not store personal data, you can always reach out if you have a concern and we will delete any server-side records that can identify you.',
      },
    ],
    body: [
      'If you live in a region with specific privacy rights (such as the EU or California), we will honor relevant requests to access, correct, or delete any personal information we may have about you. Because we intentionally avoid collecting such data, these requests can usually be resolved quickly.',
    ],
  },
  {
    title: 'Contact us',
    body: [
      <>
        Questions about privacy can be sent to{' '}
        <a href="mailto:suppotr@chess-analysis.org">suppotr@chess-analysis.org</a>.
      </>,
    ],
    note: 'Email: suppotr@chess-analysis.org',
  },
];

export const metadata: Metadata = {
  title: 'Privacy Policy - Chess Analyzer',
  description: 'Learn how Chess Analyzer processes data, what runs locally, and how to contact us about privacy questions.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <header>
          <p className="legal-eyebrow">Last updated {LAST_UPDATED}</p>
          <h1>Privacy Policy</h1>
          <p>
            Your chess analysis stays on your device whenever possible. This policy describes the limited situations
            where we process metadata, how third-party providers fit into the picture, and what choices you have over
            your information.
          </p>
        </header>
        {SECTIONS.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.body.map((paragraph, idx) => (
              <p key={`${section.title}-body-${idx}`}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul className="legal-list">
                {section.bullets.map((item, idx) => (
                  <li key={`${section.title}-bullet-${idx}`}>
                    {item.lead && <strong>{item.lead} </strong>}
                    {item.text}
                  </li>
                ))}
              </ul>
            )}
            {section.note && <p className="legal-note">{section.note}</p>}
          </section>
        ))}
        <p className="legal-note" style={{ marginTop: 32 }}>
          Need something else? Visit our <Link href="/contact">contact page</Link>.
        </p>
      </article>
    </main>
  );
}
