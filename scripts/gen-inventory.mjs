import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const navSrc = fs.readFileSync(path.join(root, 'src/config/nav.ts'), 'utf8');

// Ambil setiap object leaf yang punya path + source.
const entries = [];
// Jangan melompati leaf berikutnya: larang `label:` muncul di antara field.
const gap = "(?:(?!label:)[\\s\\S])*?";
const re = new RegExp(
  `label:\\s*'([^']+)'${gap}path:\\s*'([^']+)'${gap}source:\\s*'([^']+)'${gap}status:\\s*'([^']+)'`,
  'g',
);
let m;
while ((m = re.exec(navSrc))) {
  entries.push({ label: m[1], path: m[2], source: m[3], status: m[4] });
}

const protoDir = path.join(root, '_prototype');
const htmlFiles = fs
  .readdirSync(protoDir)
  .filter((f) => f.endsWith('.html'))
  .sort();

const mapped = new Set(entries.map((e) => e.source));
const unmapped = htmlFiles.filter((f) => !mapped.has(f));

console.log('total nav routes with source:', entries.length);
console.log('total html files:', htmlFiles.length);
console.log('unmapped html files:', unmapped.length);
console.log(unmapped.join('\n'));

fs.writeFileSync(
  path.join(root, 'docs/_inventory.json'),
  JSON.stringify({ entries, htmlFiles, unmapped }, null, 2),
);
