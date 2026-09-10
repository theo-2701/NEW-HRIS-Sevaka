import fs from 'node:fs';

const { entries, htmlFiles, unmapped } = JSON.parse(fs.readFileSync('docs/_inventory.json', 'utf8'));

const MODULES = [
  ['/me', 'Employee Profile (ESS)'],
  ['/employees', 'Employee Management'],
  ['/time', 'Time Management'],
  ['/finance', 'Finance'],
  ['/payroll', 'Payroll'],
  ['/productivity', 'Productivity'],
  ['/company-management', 'Company Management'],
  ['/company', 'Company'],
  ['/documents', 'Document'],
  ['/verify', 'Document'],
  ['/settings', 'System & Settings'],
  ['/recruitment', 'Recruitment'],
  ['/performance', 'Performance Management'],
];

function moduleOf(p) {
  const hit = MODULES.find(([prefix]) => p === prefix || p.startsWith(prefix + '/'));
  return hit ? hit[1] : 'Lainnya';
}

const grouped = new Map();
for (const e of entries) {
  const mod = moduleOf(e.path);
  if (!grouped.has(mod)) grouped.set(mod, []);
  grouped.get(mod).push(e);
}

const order = [...new Set(MODULES.map(([, m]) => m))];
let out = '';

out += `# Inventaris Halaman — prototype → route React\n\n`;
out += `Dibuat dari \`src/config/nav.ts\`. Kolom **Status** mengikuti field \`status\` di file itu:\n`;
out += `\`done\` = sudah jadi komponen React, \`todo\` = masih \`PlaceholderPage\`.\n\n`;
out += `Prototype: ${htmlFiles.length} file HTML · Route bernav: ${entries.length}\n\n`;
out += `> Saat sebuah layar selesai dikonversi: daftarkan route-nya di \`src/app/routes.tsx\`,\n`;
out += `> ubah \`status\` leaf-nya jadi \`'done'\` di \`src/config/nav.ts\`, lalu regenerasi dokumen ini.\n\n`;

out += `## Sudah dikonversi\n\n`;
out += `| Route | Layar | Prototype |\n|---|---|---|\n`;
out += `| \`/auth/login\`, \`/auth/login/username\`, \`/auth/login/whatsapp\`, \`/auth/magic-link-sent\`, \`/auth/verify\`, \`/auth/otp\`, \`/auth/forgot-password\`, \`/auth/forgot-password/sent\`, \`/auth/reset-password\`, \`/auth/reset-password/done\` | Auth (L-EMAIL · L-USER · L-WA · MLS · AV · OTP · RP1 · RP-SENT · RP2 · RP-DONE) | \`auth.html\` + \`js/auth.js\` |\n`;
out += `| \`/\` | Dashboard | \`index.html\` + \`js/dashboard.js\` |\n\n`;

for (const mod of order) {
  const rows = grouped.get(mod);
  if (!rows) continue;
  out += `## ${mod}\n\n`;
  out += `| Route | Layar | Prototype | Status |\n|---|---|---|---|\n`;
  for (const r of rows.sort((a, b) => a.path.localeCompare(b.path))) {
    out += `| \`${r.path}\` | ${r.label} | \`${r.source}\` | ${r.status} |\n`;
  }
  out += '\n';
}

// Layar tanpa baris menu — dihitung ulang dari `js/shell.js`, bukan didaftar
// manual, supaya tidak ada menu karangan yang menyelinap masuk.
const UNMAPPED_NOTES = {
  'add-employee.html': 'Dibuka dari tombol di halaman New Joiner, bukan dari menu.',
  'transition-dashboard.html': 'Detail transisi — dibuka lewat "View Detail" di daftar Employee Transfer.',
  'auth.html': 'Layar login; di luar shell bernavigasi.',
  'index.html': 'Dashboard — tile tersendiri di sidebar, bukan baris NAV.',
  'document-verify.html': 'Verifikasi publik — memang permanen tanpa menu (DOC-80).',
  'finance-loan-detail.html': 'Halaman detail; daftarkan sebagai bentuk `:id` saat modul Finance dikonversi.',
  'company-asset-detail.html': 'Halaman detail aset; bentuk `:id` saat modul Assets dikonversi.',
  'recruitment-job-listing-detail.html': 'Halaman detail; bentuk `:id` saat modul Recruitment dikonversi.',
  'recruitment-import-log-detail.html': 'Halaman detail; bentuk `:id` saat modul Recruitment dikonversi.',
};

out += `## Belum masuk peta nav\n\n`;
out += `Layar ini ada di prototype tapi **tidak punya baris menu** di \`js/shell.js\`.\n`;
out += `Daftar ini dihitung ulang setiap regenerasi — jangan menambah baris menu untuk\n`;
out += `layar di sini tanpa keputusan kontrak.\n\n`;
out += `| Prototype | Catatan |\n|---|---|\n`;
for (const file of unmapped) {
  out += `| \`${file}\` | ${UNMAPPED_NOTES[file] ?? 'Belum punya baris menu di kontrak.'} |\n`;
}

fs.writeFileSync('docs/PAGE-INVENTORY.md', out);
console.log('written', out.length, 'chars');
