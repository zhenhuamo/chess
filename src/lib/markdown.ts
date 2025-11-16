import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';

// Convert markdown to HTML at build-time/server, allowing raw HTML (video, figure, etc.)
export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await remark()
    // parse markdown -> mdast
    .use(remarkRehype, { allowDangerousHtml: true }) // mdast -> hast
    .use(rehypeRaw) // parse and merge raw HTML in markdown
    .use(rehypeStringify, { allowDangerousHtml: true }) // hast -> html
    .process(markdown);
  return String(file);
}
