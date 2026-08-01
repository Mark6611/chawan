#!/usr/bin/env node
// verify-bundle-css.mjs — post-build CSS gate for the iOS-15 browser floor.
//
// WHAT: scans the built CSS bundles (build/**/*.css, adapter-static output)
// for three patterns that break old WebKit (iOS < 16.4) silently:
//   1. `backdrop-filter` without a `-webkit-backdrop-filter` twin in the same
//      rule block (or the -webkit- form without the standard one).
//   2. `color-mix(` used outside an `@supports` guard — Tailwind's own
//      color-mix output ships @supports fallbacks, hand-written color-mix
//      does not, and old Safari drops the whole declaration.
//   3. Media-query range syntax (`@media (width >= 640px)`) — needs
//      Safari 16.4; the classic min-/max- form works everywhere.
//
// WHY: these shipped-and-broke before in the sibling coffee app (see
// project_coffee_browser_floor + ~/Documents/Claude/agent-diagnostics-2026-08-01.md).
// The dev server never shows them; only the production bundle does.
//
// HOW TO RUN:  npm run build && node scripts/verify-bundle-css.mjs
// Exits 0 when clean, 1 with a violation listing otherwise.
// Fails loudly (exit 2) if the build dir / CSS files are missing, so the
// gate can never pass vacuously.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(repoRoot, 'build'); // adapter-static: pages/assets both → build/

function findCss(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		const st = statSync(p);
		if (st.isDirectory()) out.push(...findCss(p));
		else if (entry.endsWith('.css')) out.push(p);
	}
	return out;
}

/** Snippet of css around index i, for human-readable reports on minified files. */
function snippet(css, i, span = 70) {
	const start = Math.max(0, i - 20);
	return css
		.slice(start, start + span)
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Single-pass block-aware scan. Tracks a stack of contexts so we know,
 * for every rule block, (a) its own immediate declaration text and
 * (b) whether any ancestor is an @supports block.
 */
function analyze(css, file, violations) {
	const stack = []; // { type: 'supports'|'media'|'atrule'|'rule', decls, start }
	let buf = ''; // text since last { } or ; at the current level (prelude accumulator)
	let i = 0;
	const n = css.length;
	const inSupports = () => stack.some((c) => c.type === 'supports');

	while (i < n) {
		const ch = css[i];
		if (ch === '/' && css[i + 1] === '*') {
			const end = css.indexOf('*/', i + 2);
			i = end === -1 ? n : end + 2;
			continue;
		}
		if (ch === '"' || ch === "'") {
			const q = ch;
			const from = i;
			i++;
			while (i < n && css[i] !== q) i += css[i] === '\\' ? 2 : 1;
			i++;
			buf += css.slice(from, i);
			if (stack.length) stack[stack.length - 1].decls += css.slice(from, i);
			continue;
		}
		if (ch === '{') {
			const prelude = buf.trim();
			// The prelude chars streamed into the parent's decls as we read them;
			// strip them so selectors/@-rule conditions (which legitimately contain
			// e.g. `color-mix(` in an @supports test) never count as declarations.
			if (stack.length && buf.length)
				stack[stack.length - 1].decls = stack[stack.length - 1].decls.slice(0, -buf.length);
			buf = '';
			let type = 'rule';
			if (prelude.startsWith('@supports')) type = 'supports';
			else if (prelude.startsWith('@media')) {
				type = 'media';
				// (3) range syntax in the media prelude: any <, >, <=, >= comparator
				if (/[<>]=?/.test(prelude)) {
					violations.push({
						file,
						rule: 'media-range-syntax',
						detail: `range syntax needs Safari 16.4+: ${prelude.slice(0, 90)}`
					});
				}
			} else if (prelude.startsWith('@')) type = 'atrule';
			stack.push({ type, decls: '', start: i });
			i++;
			continue;
		}
		if (ch === '}') {
			const ctx = stack.pop();
			if (ctx) checkBlock(ctx, css, file, violations, inSupports());
			buf = '';
			i++;
			continue;
		}
		if (ch === ';') buf = '';
		else buf += ch;
		if (stack.length) stack[stack.length - 1].decls += ch;
		i++;
	}
}

function checkBlock(ctx, css, file, violations, ancestorSupports) {
	const decls = ctx.decls;

	// (1) backdrop-filter pairing — both twins must appear in the same block.
	const hasStd = /(?<![-\w])backdrop-filter\s*:/.test(decls);
	const hasWebkit = /-webkit-backdrop-filter\s*:/.test(decls);
	if (hasStd !== hasWebkit) {
		violations.push({
			file,
			rule: 'backdrop-filter-pairing',
			detail: `${hasStd ? 'missing -webkit-backdrop-filter twin' : 'missing standard backdrop-filter twin'} near: ${snippet(css, ctx.start)}`
		});
	}

	// (2) color-mix( in declarations outside any @supports ancestor.
	// The @supports *condition itself* legitimately contains color-mix( —
	// that text lives in the prelude, not in decls, so it is not flagged.
	if (!ancestorSupports && ctx.type !== 'supports' && decls.includes('color-mix(')) {
		const at = ctx.start + decls.indexOf('color-mix(');
		violations.push({
			file,
			rule: 'color-mix-unguarded',
			detail: `color-mix() outside @supports near: ${snippet(css, at)}`
		});
	}
}

// ---- main ----
if (!existsSync(buildDir)) {
	console.error(
		`verify-bundle-css: build dir not found: ${buildDir} — run \`npm run build\` first.`
	);
	process.exit(2);
}
const cssFiles = findCss(buildDir);
if (cssFiles.length === 0) {
	console.error(`verify-bundle-css: no .css files under ${buildDir} — refusing to pass vacuously.`);
	process.exit(2);
}

const violations = [];
for (const f of cssFiles) analyze(readFileSync(f, 'utf8'), relative(repoRoot, f), violations);

if (violations.length) {
	const affected = new Set(violations.map((v) => v.file)).size;
	console.error(
		`verify-bundle-css: ${violations.length} violation(s) in ${affected} of ${cssFiles.length} CSS file(s):\n`
	);
	for (const v of violations) console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}\n`);
	process.exit(1);
}
console.log(
	`verify-bundle-css: OK — ${cssFiles.length} CSS file(s) clean (backdrop-filter pairs, color-mix guards, no media range syntax).`
);
