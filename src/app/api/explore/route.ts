import { NextRequest } from 'next/server';
import { GET as handleSourceGet } from './[source]/route';

export const runtime = 'edge';

export function GET(request: NextRequest) {
  return handleSourceGet(request, { params: Promise.resolve({ source: 'lichess' }) });
}
