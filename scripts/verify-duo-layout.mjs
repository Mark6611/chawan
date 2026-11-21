// iPhone Duo layout gate. Run after a build:  npm run build && npm run verify:duo
//
// There is no way to see a foldable in a browser, so this stands the Duo up from
// its measured numbers (the Buffy sibling took them on the iOS 27.2 Duo
// simulator) and checks what must hold in every pose:
//
//   folded    466×678pt   outer display, status column 84pt on the right
//   unfolded  951×669pt   inner display, LANDSCAPE, hinge down the middle
//   turned    669×951pt   inner display, portrait
//   floor     860 / 859   the width at which the two-pane layout switches
//
// Chromium reports every safe-area inset as 0, so the server rewrites env() in
// the built CSS to the pose's real insets. CSS ONLY: Tailwind class names such
// as `pr-[env(safe-area-inset-right)]` appear verbatim in the JavaScript, and
// rewriting them there renames the class out from under its own rule. (In the
// stylesheet the same text is backslash-escaped inside the selector, so only
// the declaration is touched.) Which is why nothing in src/ may put env() in an
// inline style — it would be invisible to this gate. `data-foldable` is set by an
// init script (on a device the native hinge plugin sets it — that timing is
// covered by src/lib/hinge.test.ts and an on-device run, not here).
//
// Exits 1 with a listing on any violation, 2 if the build is missing.

import { chromium } from '@playwright/test';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const BUILD = resolve(process.env.DUO_BUILD ?? 'build'); // override to test the gate itself
const PORT = 4343;
const SHOTS = process.env.DUO_SHOTS ?? null; // directory for screenshots, optional
const SPLIT_MIN = 860; // must match layout.css and $lib/split.svelte.ts
const FOLD_CLEAR = 12; // every pane keeps this far from the fold

if (!existsSync(join(BUILD, 'index.html'))) {
	console.error('verify-duo-layout: build/ is missing — run `npm run build` first.');
	process.exit(2);
}

const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.webmanifest': 'application/manifest+json'
};
let insets = { top: 0, right: 0, bottom: 0, left: 0 };
const ENV = /env\(\s*safe-area-inset-(top|right|bottom|left)\s*(?:,[^()]*)?\)/g;
const server = http.createServer(async (req, resp) => {
	const p = decodeURIComponent((req.url || '/').split('?')[0]);
	let file = join(BUILD, p === '/' ? 'index.html' : p);
	if (!existsSync(file) || !extname(file)) file = join(BUILD, 'index.html');
	const ext = extname(file);
	let body = await readFile(file);
	if (ext === '.css') {
		body = Buffer.from(body.toString('utf8').replace(ENV, (_, side) => `${insets[side]}px`));
	}
	resp.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
	resp.end(body);
});
await new Promise((ok) => server.listen(PORT, ok));
const U = `http://localhost:${PORT}`;

// ── Seed: enough for every list, pane and detail page to have content ────────
const NOW = Date.now();
const iso = (daysAgo) => new Date(NOW - daysAgo * 86_400_000).toISOString();
const TIN = '10000000-0000-4000-8000-0000000000d1';
const SES = '20000000-0000-4000-8000-0000000000d1';
const tins = [
	{
		id: TIN,
		name: 'Eiju',
		maker: 'Marukyu Kōyamaen',
		grade: 'ceremonial',
		region: 'uji',
		weightGrams: 40,
		openedAt: iso(12),
		archived: false,
		catalogId: 'mk-eiju',
		notes: 'Deep umami, soft sweetness.',
		createdAt: iso(14),
		updatedAt: iso(2)
	},
	{
		id: '10000000-0000-4000-8000-0000000000d2',
		name: 'Ummon-no-mukashi',
		maker: 'Ippodo',
		grade: 'ceremonial',
		region: 'uji',
		weightGrams: 20,
		archived: false,
		createdAt: iso(6),
		updatedAt: iso(1)
	}
];
const sessions = [];
for (let i = 0; i < 9; i++) {
	sessions.push({
		kind: 'personal',
		id: i === 0 ? SES : `20000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`,
		brewedAt: iso(i),
		style: 'usucha',
		tinId: TIN,
		powderGrams: 2,
		waterGrams: 60,
		waterTempC: 74 + (i % 3) * 2,
		whisk: 'chasen-100',
		rating: 3.5 + (i % 3) * 0.5,
		notes: i % 2 ? 'Vegetal, no astringency.' : undefined,
		createdAt: iso(i),
		updatedAt: iso(i)
	});
}
sessions.push({
	kind: 'cafe',
	id: '20000000-0000-4000-8000-0000000000c1',
	brewedAt: iso(3),
	style: 'usucha',
	cafeName: 'Ippodo Tea Kyoto',
	maker: 'Ippodo',
	region: 'uji',
	rating: 4.5,
	priceCents: 28000,
	priceCurrency: 'THB',
	createdAt: iso(3),
	updatedAt: iso(3)
});

const ROUTES = [
	{ path: '/', kind: 'split' },
	{ path: '/sessions', kind: 'split' },
	{ path: '/tins', kind: 'split' },
	{ path: '/catalog', kind: 'split' },
	{ path: '/sessions/new/personal', kind: 'split' },
	{ path: '/insights', kind: 'flow' },
	{ path: '/settings', kind: 'flow' },
	{ path: `/sessions/${SES}`, kind: 'flow' },
	{ path: `/tins/${TIN}`, kind: 'flow' },
	{ path: '/catalog/mk-eiju', kind: 'flow' },
	{ path: '/sessions/new/cafe', kind: 'flow' },
	{ path: '/tins/new', kind: 'flow' },
	{ path: '/sessions/new', kind: 'flow' }
];
const POSES = [
	{
		name: 'folded',
		w: 466,
		h: 678,
		insets: { top: 0, right: 84, bottom: 34, left: 0 },
		panes: false
	},
	{
		name: 'unfolded',
		w: 951,
		h: 669,
		insets: { top: 0, right: 84, bottom: 34, left: 0 },
		panes: true
	},
	{
		name: 'turned',
		w: 669,
		h: 951,
		insets: { top: 0, right: 84, bottom: 34, left: 0 },
		panes: false
	},
	{
		name: 'split-floor',
		w: SPLIT_MIN,
		h: 669,
		insets: { top: 0, right: 84, bottom: 34, left: 0 },
		panes: true
	},
	{
		name: 'under-floor',
		w: SPLIT_MIN - 1,
		h: 669,
		insets: { top: 0, right: 84, bottom: 34, left: 0 },
		panes: false
	}
];

const failures = [];
const fail = (pose, route, msg) => failures.push(`[${pose} ${route}] ${msg}`);
const browser = await chromium.launch();
if (SHOTS) await mkdir(SHOTS, { recursive: true });

async function seeded(pose, foldable = true) {
	insets = pose.insets;
	const ctx = await browser.newContext({
		viewport: { width: pose.w, height: pose.h },
		serviceWorkers: 'block'
	});
	if (foldable) {
		// The init script can run before <html> exists; wait for it if so.
		await ctx.addInitScript(() => {
			const set = () => {
				if (!document.documentElement) return false;
				document.documentElement.dataset.foldable = '';
				return true;
			};
			if (!set()) {
				const mo = new MutationObserver(() => set() && mo.disconnect());
				mo.observe(document, { childList: true });
			}
		});
	}
	const page = await ctx.newPage();
	await page.goto(`${U}/`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(300);
	await page.evaluate(
		async ({ tins, sessions }) => {
			const db = await new Promise((ok, err) => {
				const r = indexedDB.open('chawan');
				r.onsuccess = () => ok(r.result);
				r.onerror = () => err(r.error);
			});
			await new Promise((ok, err) => {
				const tx = db.transaction(['tins', 'sessions'], 'readwrite');
				for (const t of tins) tx.objectStore('tins').put(t);
				for (const s of sessions) tx.objectStore('sessions').put(s);
				tx.oncomplete = ok;
				tx.onerror = () => err(tx.error);
			});
			db.close();
		},
		{ tins, sessions }
	);
	return { ctx, page };
}

// What the page looks like geometrically, measured in the page.
const measure = () => {
	const vw = window.innerWidth;
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
	};
	const box = (el) => {
		const r = el.getBoundingClientRect();
		return {
			l: Math.round(r.left * 10) / 10,
			r: Math.round(r.right * 10) / 10,
			t: Math.round(r.top),
			b: Math.round(r.bottom)
		};
	};
	// The part of [l, r] that is actually painted: clipped by every ancestor that
	// scrolls or hides sideways (the catalog's filter chips run off the edge of a
	// horizontal scroller on purpose). Null when none of it is on screen.
	const clip = (el, l, r) => {
		for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
			const ox = getComputedStyle(a).overflowX;
			if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') {
				const ar = a.getBoundingClientRect();
				l = Math.max(l, ar.left);
				r = Math.min(r, ar.right);
				if (r - l <= 0.5) return null;
			}
		}
		return { l: Math.round(l * 10) / 10, r: Math.round(r * 10) / 10 };
	};
	const label = (el) =>
		`${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
	const main = document.querySelector('main');
	const aside = document.querySelector('.split-aside');
	const rail = document.querySelector('.tab-rail .glass'); // the visible bar, not its padded wrapper
	const controls = [
		...document.querySelectorAll(
			'main a, main button, main input, main textarea, main select, .split-aside a, .split-aside button, nav a, body > button'
		)
	]
		.filter(visible)
		.map((el) => {
			const b = box(el);
			const c = clip(el, b.l, b.r);
			return c ? { ...b, ...c, label: label(el) } : null;
		})
		.filter(Boolean);
	// Text that actually paints: leaf-ish elements with their own text.
	const texts = [...document.querySelectorAll('main *, .split-aside *')]
		.filter(
			(el) =>
				visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
		)
		.map((el) => {
			const range = document.createRange();
			range.selectNodeContents(el);
			const r = range.getBoundingClientRect();
			const c = clip(el, r.left, r.right);
			return c ? { ...c, label: label(el) } : null;
		})
		.filter(Boolean);
	return {
		vw,
		scrollW: document.documentElement.scrollWidth,
		main: main
			? {
					...box(main),
					cols: getComputedStyle(main).columnCount,
					padL: parseFloat(getComputedStyle(main).paddingLeft),
					padR: parseFloat(getComputedStyle(main).paddingRight)
				}
			: null,
		aside: aside
			? {
					...box(aside),
					shown: visible(aside),
					padR: parseFloat(getComputedStyle(aside).paddingRight)
				}
			: null,
		rail: rail ? box(rail) : null,
		historyButton: [...document.querySelectorAll('main button')].some(
			(b) => b.textContent.trim() === 'History' && visible(b)
		),
		controls,
		texts
	};
};

for (const pose of POSES) {
	const { ctx, page } = await seeded(pose);
	const fold = pose.w / 2;
	const safeRight = pose.w - pose.insets.right;
	for (const route of ROUTES) {
		await page.goto(`${U}${route.path}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(450);
		const m = await page.evaluate(measure);
		const tag = (msg) => fail(pose.name, route.path, msg);
		if (SHOTS)
			await page.screenshot({
				path: join(
					SHOTS,
					`${pose.name}${route.path.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || '_home'}.png`
				)
			});

		if (m.scrollW > m.vw + 0.5)
			tag(`page is ${m.scrollW}px wide in a ${m.vw}px viewport (sideways scroll)`);
		if (!m.main) {
			tag('no <main>');
			continue;
		}

		// Nothing you tap, and nothing you read, under the status column.
		for (const c of m.controls)
			if (c.r > safeRight + 0.5)
				tag(`control under the status column (right edge ${c.r} > ${safeRight}): ${c.label}`);
		for (const t of m.texts)
			if (t.r > safeRight + 0.5)
				tag(
					`text under the status column (right edge ${Math.round(t.r)} > ${safeRight}): ${t.label}`
				);

		if (pose.panes) {
			// Nothing straddles the fold, and everything keeps clear of it.
			const crosses = (b) => b.l < fold + FOLD_CLEAR - 0.5 && b.r > fold - FOLD_CLEAR + 0.5;
			for (const c of m.controls)
				if (crosses(c))
					tag(
						`control within ${FOLD_CLEAR}px of the fold (${c.l}–${c.r}, fold ${fold}): ${c.label}`
					);
			for (const t of m.texts)
				if (crosses(t))
					tag(
						`text within ${FOLD_CLEAR}px of the fold (${Math.round(t.l)}–${Math.round(t.r)}, fold ${fold}): ${t.label}`
					);
			if (m.rail && m.rail.l < fold + FOLD_CLEAR - 0.5)
				tag(`tab rail reaches into the left half (left edge ${m.rail.l}, fold ${fold})`);
			if (route.kind === 'split') {
				if (!m.aside || !m.aside.shown) tag('the reference pane is not showing');
				else {
					if (m.aside.r > fold + 0.5) tag(`pane crosses the fold (right edge ${m.aside.r})`);
					if (m.aside.padR < 24 + FOLD_CLEAR)
						tag(`pane padding at the fold is ${m.aside.padR}px, wants ${24 + FOLD_CLEAR}`);
				}
				// The page is the half you touch: the RIGHT one.
				if (m.main.l < fold - 0.5)
					tag(`page starts at ${m.main.l}, left of the fold — it should be the right half`);
				if (route.path === '/sessions/new/personal' && m.historyButton)
					tag('History button is showing beside the pane that already shows the history');
			} else {
				if (String(m.main.cols) !== '2')
					tag(`expected two columns, got column-count ${m.main.cols}`);
				// The column gap must sit ON the fold: content box symmetric about it.
				const mid = (m.main.l + m.main.padL + (m.main.r - m.main.padR)) / 2;
				if (Math.abs(mid - fold) > 1)
					tag(`columns are centred at ${mid.toFixed(1)}, not on the fold at ${fold}`);
			}
		} else {
			// One column in every other pose — and the same history reachable.
			if (m.aside?.shown) tag('the reference pane is showing in a single-column pose');
			if (String(m.main.cols) === '2') tag('two columns in a single-column pose');
			if (route.path === '/sessions/new/personal' && !m.historyButton)
				tag('no History button — the tin history would exist in the unfolded pose only');
		}
	}
	await ctx.close();
}

// A wide screen WITHOUT a hinge (iPad, desktop) must keep the centred column.
{
	const pose = {
		name: 'ipad-no-hinge',
		w: 951,
		h: 669,
		insets: { top: 0, right: 0, bottom: 0, left: 0 }
	};
	const { ctx, page } = await seeded(pose, false);
	for (const path of ['/', '/insights']) {
		await page.goto(`${U}${path}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(350);
		const m = await page.evaluate(measure);
		if (m.aside?.shown) fail(pose.name, path, 'pane showing without a hinge');
		if (String(m.main.cols) === '2') fail(pose.name, path, 'two columns without a hinge');
		if (m.main.r - m.main.l > 449)
			fail(
				pose.name,
				path,
				`column is ${m.main.r - m.main.l}px wide; it should stay at 448 without a hinge`
			);
	}
	await ctx.close();
}

// Behaviour that changes with the pane: a row fills the pane instead of navigating.
{
	const pose = POSES[1];
	const { ctx, page } = await seeded(pose);
	await page.goto(`${U}/sessions`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(450);
	const rows = page.locator('main a[href^="/sessions/"]');
	const before = await page.locator('.split-aside').innerText();
	await rows.nth(3).click();
	await page.waitForTimeout(350);
	if (!page.url().endsWith('/sessions'))
		fail(
			'unfolded',
			'/sessions',
			`tapping a row navigated to ${page.url().replace(U, '')} instead of filling the pane`
		);
	if ((await page.locator('.split-aside').innerText()) === before)
		fail('unfolded', '/sessions', 'tapping a row did not change the pane');
	if ((await page.locator('main a[aria-current="true"]').count()) !== 1)
		fail('unfolded', '/sessions', 'exactly one row should be marked as showing in the pane');
	await ctx.close();

	const folded = await seeded(POSES[0]);
	await folded.page.goto(`${U}/sessions`, { waitUntil: 'networkidle' });
	await folded.page.waitForTimeout(450);
	await folded.page.locator('main a[href^="/sessions/"]').nth(2).click();
	await folded.page.waitForTimeout(450);
	if (folded.page.url().endsWith('/sessions'))
		fail(
			'folded',
			'/sessions',
			'tapping a row did not navigate — rows must stay plain links without a pane'
		);
	await folded.ctx.close();
}

await browser.close();
server.close();

if (failures.length) {
	console.error(`verify-duo-layout: ${failures.length} problem(s)\n`);
	for (const f of failures.slice(0, 60)) console.error('  ✗ ' + f);
	if (failures.length > 60) console.error(`  … and ${failures.length - 60} more`);
	process.exit(1);
}
console.log(
	`verify-duo-layout: OK — ${ROUTES.length} routes × ${POSES.length} poses, plus the no-hinge and row-selection checks.`
);
