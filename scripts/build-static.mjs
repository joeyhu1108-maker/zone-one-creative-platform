import { cpSync, mkdirSync, rmSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css', 'particle-story.js', '_headers', 'assets', 'school', 'clinic', 'library']) {
  cpSync(new URL(file, root), new URL(file, dist), { recursive: true });
}
console.log('Static site staged in dist/');
