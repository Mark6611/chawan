// The App Store privacy URL points at docs/privacy.html (served from GitHub
// Pages), while users read src/routes/privacy/+page.svelte. They are separate
// files, so they drift — and the copy a REVIEWER reads is the one nobody edits.
//
// That already happened: the in-app page was corrected to "archive any tin"
// (there is no deleteTin in the repository) while docs/privacy.html kept
// promising deletion, and it stayed wrong through a submission.
//
// This compares the user-facing claim lists rather than whole files, since the
// two are different formats and legitimately differ in markup.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const decode = (s) =>
	s
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
const claims = (file) =>
	[...readFileSync(resolve(REPO, file), 'utf8').matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) =>
		decode(m[1])
	);

const docs = claims('docs/privacy.html');
const app = claims('src/routes/privacy/+page.svelte');

const missing = docs.filter((c) => !app.includes(c));
const extra = app.filter((c) => !docs.includes(c));

if (missing.length || extra.length) {
	console.error('Privacy policy drift — docs/privacy.html is the URL App Review fetches.\n');
	for (const c of missing) console.error(`  only in docs/privacy.html : ${c}`);
	for (const c of extra) console.error(`  only in the in-app page   : ${c}`);
	console.error('\nMake the claim lists agree before shipping.');
	process.exit(1);
}
console.log(`privacy parity OK — ${docs.length} claims match across both copies.`);
