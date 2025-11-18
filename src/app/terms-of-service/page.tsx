import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

const LAST_UPDATED = 'May 30, 2024';

type Section = {
  title: string;
  body: ReactNode[];
  bullets?: { lead?: string; text: string }[];
};

const SECTIONS: Section[] = [
  {
    title: 'Acceptance of the Terms',
    body: [
      'Chess Analyzer is offered by the chess-analysis.org team ("we", "us"). By accessing the site, installing our service worker, or using any of the features on the domain, you are agreeing to these Terms of Service. If you do not agree, please discontinue using the site.',
    ],
  },
  {
    title: 'Description of the Service',
    body: [
      'The site provides an in-browser chess analysis board, Stockfish-powered evaluation, repertoire exploration tools, and related educational content. The service is provided on an as-is, as-available basis. We may update or remove functionality at any time without prior notice.',
    ],
  },
  {
    title: 'Eligibility and Registration',
    body: [
      'You must be able to enter into a binding contract in your jurisdiction to use the site. We do not require registration or user accounts. If future premium features require authentication, you agree to provide accurate information and to keep any credentials secure.',
    ],
  },
  {
    title: 'Acceptable Use',
    body: [
      'To keep Chess Analyzer fast and available for everyone, you agree to follow these rules:',
    ],
    bullets: [
      { lead: 'Respect intellectual property.', text: 'Only upload PGNs or other materials that you have the right to share. Do not attempt to reverse engineer or redistribute commercial engines from this site.' },
      { lead: 'No abuse or disruption.', text: 'Do not attempt to overload our APIs, scrape the site excessively, or interfere with other users\' ability to access the service.' },
      { lead: 'Security testing requires permission.', text: 'You must obtain written consent before performing any penetration tests or security research that could impact availability or user data.' },
      { lead: 'Follow the law.', text: 'You may not use Chess Analyzer for unlawful purposes, including exporting sanctioned technology or distributing malicious code.' },
    ],
  },
  {
    title: 'Intellectual Property and Licensing',
    body: [
      'All original content, logos, and interface elements are owned by us or our licensors. We grant you a limited, non-exclusive license to use the service for personal or educational purposes. The Stockfish chess engine and other open-source components remain subject to their respective licenses, which are available in our repository.',
    ],
  },
  {
    title: 'Third-Party Services',
    body: [
      'We rely on third parties such as Vercel, Cloudflare, Google Analytics, and Microsoft Clarity for hosting and diagnostics. Your use of those services through Chess Analyzer is subject to their terms and policies in addition to ours. Optional integrations, such as our Discord server, are governed by the third party that operates them.',
    ],
  },
  {
    title: 'Privacy',
    body: [
      <>
        Our <Link href="/privacy-policy">Privacy Policy</Link> explains what data we collect and how we process it. By using the site you consent to those practices.
      </>,
    ],
  },
  {
    title: 'Disclaimers',
    body: [
      'The service is provided without warranties of any kind, express or implied. This includes, but is not limited to, implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that engine evaluations or theoretical suggestions will be correct, that the site will be error-free, or that access will be uninterrupted.',
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      'To the fullest extent permitted by law, we will not be liable for any indirect, incidental, special, consequential, or exemplary damages arising from your use of Chess Analyzer. Our total liability for direct damages will not exceed the amount (if any) you paid us for using the service in the twelve months preceding the claim.',
    ],
  },
  {
    title: 'Indemnification',
    body: [
      'You agree to indemnify and hold us harmless from any claims, losses, or expenses (including reasonable attorneys\' fees) that arise from your use of the site, violation of these terms, or infringement of any third-party rights.',
    ],
  },
  {
    title: 'Termination',
    body: [
      'We may suspend or terminate access to Chess Analyzer at any time if we believe you have violated these terms or if doing so is necessary to protect the service. You may stop using the service at any time. Provisions that by their nature should survive (such as intellectual property, disclaimers, and limitation of liability) will continue after termination.',
    ],
  },
  {
    title: 'Changes to these Terms',
    body: [
      'We may update these Terms of Service to reflect new features, legal requirements, or operational changes. When we do, we will update the "Last updated" date at the top of this page. Continued use of the service after an update constitutes acceptance of the revised terms.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'If you have questions about these terms, please email suppotr@chess-analysis.org or reach us through the contact page. We aim to respond within a few business days.',
    ],
  },
];

export const metadata: Metadata = {
  title: 'Terms of Service - Chess Analyzer',
  description: 'The terms that govern your use of the Chess Analyzer website and tools.',
};

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <header>
          <p className="legal-eyebrow">Last updated {LAST_UPDATED}</p>
          <h1>Terms of Service</h1>
          <p>
            Please read these terms carefully before using Chess Analyzer. They explain what you can expect from the
            service, what we expect from you, and how to reach us if something goes wrong.
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
          </section>
        ))}
        <p className="legal-note" style={{ marginTop: 32 }}>
          Need help? Visit the <Link href="/contact">contact page</Link>.
        </p>
      </article>
    </main>
  );
}
