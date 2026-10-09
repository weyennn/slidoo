import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../dist/index.html', import.meta.url);
const html = await readFile(indexPath, 'utf8');
if (!html.includes('<title>open-slide</title>')) {
  throw new Error('Expected framework HTML title not found; refusing to silently skip Slidoo branding.');
}
await writeFile(indexPath, html.replace('<title>open-slide</title>', '<title>Slidoo</title>'));
