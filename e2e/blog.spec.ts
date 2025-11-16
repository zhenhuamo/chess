import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join('.playwright-mcp');

test('Blog post renders video and screenshot image', async ({ page }) => {
  await page.goto('/blog/introducing-chess-analyzer', { waitUntil: 'networkidle' });

  // Wait for hydration and content
  await expect(page.locator('h1', { hasText: 'Introducing Chess Analyzer' })).toBeVisible();

  // Video element (with mp4 source)
  const video = page.locator('article video');
  await expect(video).toBeVisible();
  await expect(page.locator('article video source[src$=".mp4"]')).toHaveCount(1);

  // Screenshot image
  const img = page.locator('article img[src*="cacle.chess-analysis.org/img/chess-analysis.png"]');
  await expect(img).toBeVisible();

  // Save a proof screenshot
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, 'blog-introducing-chess-analyzer.png'), fullPage: true });
});

