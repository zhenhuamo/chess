import type { D1Database } from '@cloudflare/workers-types';

declare global {
    interface CloudflareEnv {
        PUZZLE_DB: D1Database;
    }
}
