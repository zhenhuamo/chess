import type { UpdateEntry } from './updates';
import { UPDATES } from './updates';
import UpdatesClient from './Client';

export const metadata = {
  title: 'Updates - Chess Analyzer',
  description: 'Release notes and change log for Chess Analyzer.',
};

const byDateDesc = (a: UpdateEntry, b: UpdateEntry) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export default function UpdatesPage() {
  const updates = [...UPDATES].sort(byDateDesc);

  return <UpdatesClient updates={updates} />;
}
