import ContactClient from './ContactClient';

export const metadata = {
  title: 'Contact - Chess Analyzer',
  description: 'Contact the Chess Analyzer team for support, feedback, or suggestions.',
};

export default function ContactPage() {
  // Server component wrapper to provide metadata; UI is client component
  return <ContactClient />;
}

