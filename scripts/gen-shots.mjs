// App Store screenshot generator for chawan (modeled on buffy's gen-shots.mjs,
// seeded like the coffee sibling's screenshots.mjs).
//
// Serves the static build/ (adapter-static SPA fallback), seeds IndexedDB with
// realistic matcha data, and captures exact device-pixel PNGs for the two
// display sets the 1.0 listing already has:
//   iPhone 6.7" -> 1290x2796  (viewport 430x932  @ dsf 3)  [APP_IPHONE_67]
//   iPad  12.9" -> 2048x2732  (viewport 512x683  @ dsf 4)  [APP_IPAD_PRO_3GEN_129]
// The iPad set reuses the phone UI full-bleed (buffy's shipped approach) — the
// app is a phone-first layout and a 1024pt viewport would render it sparse.
//
// Seeding trap (from the family gotchas): Dexie's IDB version is schema x 10,
// so NEVER indexedDB.open('chawan', 3). Load the app once so Dexie creates the
// schema, then open WITHOUT a version and put rows directly.
//
// Run: node scripts/gen-shots.mjs        (after `npm run build`)
// Output: appstore-screenshots/ and appstore-screenshots-ipad13/
// Upload: node scripts/asc-screenshots.mjs <versionLocalizationId> --replace

import { chromium } from '@playwright/test';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const BUILD = resolve('build');
const PORT = 4341;
const MIME = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.webmanifest': 'application/manifest+json'
};

function serve() {
	return new Promise((ok) => {
		const server = http.createServer(async (req, resp) => {
			try {
				const p = decodeURIComponent((req.url || '/').split('?')[0]);
				const file = join(BUILD, p === '/' ? 'index.html' : p);
				const body = await readFile(file);
				resp.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
				resp.end(body);
			} catch {
				const body = await readFile(join(BUILD, 'index.html'));
				resp.writeHead(200, { 'Content-Type': 'text/html' });
				resp.end(body);
			}
		});
		server.listen(PORT, () => ok(server));
	});
}

// ── Seed data — realistic tins + a fortnight of sessions ─────────────────
const NOW = Date.now();
const day = 86_400_000;
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

const TIN_EIJU = '10000000-0000-4000-8000-000000000001';
const TIN_UMMON = '10000000-0000-4000-8000-000000000002';
const TIN_ISUZU = '10000000-0000-4000-8000-000000000003';

const tins = [
	{
		id: TIN_EIJU,
		name: 'Eiju',
		maker: 'Marukyu Kōyamaen',
		grade: 'ceremonial',
		region: 'uji',
		cultivar: 'Samidori',
		harvestDate: '2026-04',
		weightGrams: 40,
		openedAt: iso(12 * day),
		archived: false,
		catalogId: 'mk-eiju',
		priceCents: 189000,
		priceCurrency: 'THB',
		notes: 'Deep umami, soft sweetness. The daily usucha.',
		createdAt: iso(14 * day),
		updatedAt: iso(2 * day)
	},
	{
		id: TIN_UMMON,
		name: 'Ummon-no-mukashi',
		maker: 'Ippodo',
		grade: 'ceremonial',
		region: 'uji',
		weightGrams: 20,
		openedAt: iso(5 * day),
		archived: false,
		priceCents: 132000,
		priceCurrency: 'THB',
		notes: 'Koicha-grade. Thick, no bitterness.',
		createdAt: iso(6 * day),
		updatedAt: iso(1 * day)
	},
	{
		id: TIN_ISUZU,
		name: 'Isuzu',
		maker: 'Marukyu Kōyamaen',
		grade: 'culinary',
		region: 'uji',
		weightGrams: 40,
		archived: false,
		catalogId: 'mk-isuzu',
		priceCents: 42000,
		priceCurrency: 'THB',
		notes: 'For lattes.',
		createdAt: iso(20 * day),
		updatedAt: iso(20 * day)
	}
];

const P = (n, daysAgo, hour, over = {}) => ({
	kind: 'personal',
	id: `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
	brewedAt: new Date(NOW - daysAgo * day - (21 - hour) * 3_600_000).toISOString(),
	style: 'usucha',
	tinId: TIN_EIJU,
	powderGrams: 2,
	waterGrams: 60,
	waterTempC: 76,
	whisk: 'chasen-100',
	rating: 4.5,
	createdAt: iso(daysAgo * day),
	updatedAt: iso(daysAgo * day),
	...over
});

const sessions = [
	P(1, 0, 8, { notes: 'Vegetal, zero astringency. Best bowl this week.', rating: 5 }),
	P(2, 1, 8, { rating: 4.5 }),
	P(3, 2, 9, {
		style: 'koicha',
		tinId: TIN_UMMON,
		powderGrams: 4,
		waterGrams: 40,
		waterTempC: 70,
		rating: 4.5,
		notes: 'Thick and sweet. Kneaded slowly.'
	}),
	P(4, 3, 8, { rating: 4 }),
	P(5, 4, 15, {
		style: 'latte',
		tinId: TIN_ISUZU,
		milk: 'oat',
		powderGrams: 3,
		waterGrams: 30,
		waterTempC: 80,
		rating: 4
	}),
	P(6, 6, 8, { rating: 4.5 }),
	{
		kind: 'cafe',
		id: '20000000-0000-4000-8000-000000000901',
		brewedAt: iso(5 * day),
		style: 'usucha',
		cafeName: 'Ippodo Tea Kyoto',
		maker: 'Ippodo',
		region: 'uji',
		rating: 4.5,
		priceCents: 28000,
		priceCurrency: 'THB',
		notes: 'Benchmark bowl.',
		createdAt: iso(5 * day),
		updatedAt: iso(5 * day)
	}
];

const SHOTS = [
	{ name: '01-today', path: '/' },
	{ name: '02-sessions', path: '/sessions' },
	{ name: '03-tins', path: '/tins' },
	{ name: '04-tin-detail', path: `/tins/${TIN_EIJU}` },
	{ name: '05-catalog', path: '/catalog' }
];

const DEVICES = [
	{ dir: 'appstore-screenshots', viewport: { width: 430, height: 932 }, dsf: 3 },
	{ dir: 'appstore-screenshots-ipad13', viewport: { width: 512, height: 683 }, dsf: 4 }
];

const server = await serve();
const browser = await chromium.launch();

for (const dev of DEVICES) {
	await mkdir(dev.dir, { recursive: true });
	const ctx = await browser.newContext({
		viewport: dev.viewport,
		deviceScaleFactor: dev.dsf,
		serviceWorkers: 'block'
	});
	const page = await ctx.newPage();

	// 1. Let the app boot once so Dexie creates the schema (day theme default).
	await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	// 2. Seed through raw IndexedDB — no version, schema already exists.
	await page.evaluate(
		async ({ tins, sessions }) => {
			const db = await new Promise((ok, err) => {
				const req = indexedDB.open('chawan');
				req.onsuccess = () => ok(req.result);
				req.onerror = () => err(req.error);
			});
			const put = (store, rows) =>
				new Promise((ok, err) => {
					const tx = db.transaction(store, 'readwrite');
					for (const r of rows) tx.objectStore(store).put(r);
					tx.oncomplete = ok;
					tx.onerror = () => err(tx.error);
				});
			await put('tins', tins);
			await put('sessions', sessions);
			// Tin photo: a warm matcha-green study, generated in-page.
			const c = document.createElement('canvas');
			c.width = 900;
			c.height = 675;
			const g = c.getContext('2d');
			const grad = g.createLinearGradient(0, 0, 900, 675);
			grad.addColorStop(0, '#3d5a3f');
			grad.addColorStop(0.55, '#5a7a4f');
			grad.addColorStop(1, '#8fae6a');
			g.fillStyle = grad;
			g.fillRect(0, 0, 900, 675);
			g.fillStyle = 'rgba(255,255,255,0.12)';
			g.beginPath();
			g.arc(450, 340, 190, 0, Math.PI * 2);
			g.fill();
			const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
			await put('tinPhotos', [{ tinId: tins[0].id, blob, updatedAt: new Date().toISOString() }]);
			db.close();
		},
		{ tins, sessions }
	);

	// 3. Capture each screen fresh.
	for (const shot of SHOTS) {
		await page.goto(`http://localhost:${PORT}${shot.path}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(700);
		await page.screenshot({ path: join(dev.dir, `${shot.name}.png`) });
		console.log(`${dev.dir}/${shot.name}.png`);
	}
	await ctx.close();
}

await browser.close();
server.close();
console.log('\nDone. Upload with: node scripts/asc-screenshots.mjs <verLocId> --replace');
