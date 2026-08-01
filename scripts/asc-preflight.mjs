// App Store Connect preflight — answers "can I actually ship right now?" BEFORE
// spending 10 minutes on an archive + upload.
//
// Ported from ~/Desktop/CODE/scripts/asc-preflight.mjs. Every ASC failure across
// these apps has been the same shape: a hidden prerequisite that only surfaces
// once the build is already made. Two that bit chawan specifically:
//   90186 "Invalid Pre-Release Train. The train version '1.0' is closed for new
//         build submissions"  — 1.0 had been APPROVED, so no further build could
//         ever go out under it; the fix was a version bump, not a rebuild.
//   90062 "CFBundleShortVersionString must contain a higher version than the
//         previously approved version"  — the same cause, reported differently.
// Both cost a full archive + upload cycle. Check 3 below catches them first.
//
// Run: node scripts/asc-preflight.mjs [targetVersion]
// Exit 0 = clear to ship. Exit 1 = at least one BLOCKER.

import { asc } from './asc-api.mjs';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_ID = '6788678149'; // "Chawan by KK"
const TARGET = process.argv[2] ?? null;

// A version in any of these states blocks creating/submitting another one.
const BLOCKING = new Set([
	'WAITING_FOR_REVIEW',
	'IN_REVIEW',
	'PENDING_DEVELOPER_RELEASE',
	'PENDING_APPLE_RELEASE',
	'PROCESSING_FOR_APP_STORE'
]);

// A version in one of these states has CLOSED its pre-release train: TestFlight
// will reject any further build on it with 90186/90062. This check does not
// exist in the coffee original — chawan is the app that hit it, twice.
const TRAIN_CLOSED = new Set(['READY_FOR_SALE', 'REPLACED_WITH_NEW_VERSION']);

const blockers = [];
const warnings = [];
const ok = [];
const sh = (c) => execSync(c, { cwd: REPO, encoding: 'utf8' }).trim();

// "1.1" and "1.1.0" are the same release. The pbxproj carries a 2-part marketing
// version while package.json (the source of __APP_VERSION__, shown in Settings
// and stamped into every backup) carries a 3-part semver, so a naive equality
// check would report a blocker on a perfectly consistent repo.
const pad3 = (v) => {
	const parts = String(v).trim().split('.').map(Number);
	while (parts.length < 3) parts.push(0);
	return parts.slice(0, 3).join('.');
};

function localVersions() {
	const pbx = readFileSync(`${REPO}/ios/App/App.xcodeproj/project.pbxproj`, 'utf8');
	const uniq = (re) => [...new Set([...pbx.matchAll(re)].map((m) => m[1].trim()))];
	const marketing = uniq(/MARKETING_VERSION = ([^;]+);/g);
	const build = uniq(/CURRENT_PROJECT_VERSION = ([^;]+);/g);
	let appVersion = null;
	try {
		// chawan has no hardcoded APP_VERSION constant (coffee does): vite.config.ts
		// defines __APP_VERSION__ from package.json, so package.json IS the in-app
		// version string.
		appVersion = JSON.parse(readFileSync(`${REPO}/package.json`, 'utf8')).version ?? null;
	} catch {
		/* unreadable package.json is reported as a warning below */
	}
	return { marketing, build, appVersion };
}

console.log('App Store Connect preflight — chawan\n' + '='.repeat(52));

// ── 1. Local version consistency ─────────────────────────────────────────
const { marketing, build, appVersion } = localVersions();
if (marketing.length !== 1)
	blockers.push(`MARKETING_VERSION disagrees across configs: ${marketing}`);
else ok.push(`MARKETING_VERSION ${marketing[0]} (consistent)`);
if (build.length !== 1) blockers.push(`CURRENT_PROJECT_VERSION disagrees across configs: ${build}`);
else ok.push(`CURRENT_PROJECT_VERSION ${build[0]} (consistent)`);
if (!appVersion) warnings.push('could not read package.json version (__APP_VERSION__ source)');
else if (marketing[0] && pad3(appVersion) !== pad3(marketing[0]))
	blockers.push(
		`package.json is ${appVersion} but the build ships ${marketing[0]} — ` +
			`Settings "About" and every backup would be stamped with the wrong version`
	);
else ok.push(`in-app version matches (package.json ${appVersion} = ${marketing[0]})`);

// ── 2. Git state (a dirty tree means the build won't match the commit) ────
const dirty = sh('git status --porcelain');
if (dirty)
	warnings.push(
		`working tree is dirty (${dirty.split('\n').length} files) — build won't match a commit`
	);
else ok.push('working tree clean');
try {
	sh('git fetch origin --quiet');
	const behind = sh('git rev-list --count HEAD..origin/main');
	if (behind !== '0')
		warnings.push(`${behind} commit(s) on origin/main not in HEAD — rebase before shipping`);
	else ok.push('in sync with origin/main');
} catch {
	warnings.push('could not reach origin to compare');
}

// ── 3. Version states: review slot AND pre-release train ──────────────────
const vres = await asc(
	'GET',
	`/v1/apps/${APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState`
);
if (!vres.ok) blockers.push(`could not list versions: HTTP ${vres.status}`);
const versions = vres.json?.data ?? [];

const blocking = versions.filter((v) => BLOCKING.has(v.attributes.appStoreState));
if (blocking.length) {
	for (const v of blocking)
		blockers.push(
			`v${v.attributes.versionString} is ${v.attributes.appStoreState} — Apple allows only ONE ` +
				`version in review; a new version cannot even be CREATED until it clears (or is cancelled). ` +
				`A TestFlight build on the EXISTING train is still fine.`
		);
} else ok.push('no version is occupying the review slot');

// The check the coffee original lacks: is the train we are about to upload to
// already closed? This is the 90186 that cost chawan a build cycle.
const current = marketing[0];
const currentVersion = versions.find((v) => v.attributes.versionString === current);
if (currentVersion && TRAIN_CLOSED.has(currentVersion.attributes.appStoreState)) {
	blockers.push(
		`v${current} is ${currentVersion.attributes.appStoreState} — its pre-release train is CLOSED. ` +
			`TestFlight will reject a new build with 90186/90062. Bump MARKETING_VERSION ` +
			`(and package.json) before archiving.`
	);
} else if (currentVersion) {
	ok.push(`v${current} is ${currentVersion.attributes.appStoreState} — train open for new builds`);
} else {
	ok.push(`v${current} has no ASC version yet — train is open (TestFlight-only so far)`);
}

const live = versions.filter((v) => v.attributes.appStoreState === 'READY_FOR_SALE');
if (live.length) ok.push(`live: ${live.map((v) => 'v' + v.attributes.versionString).join(', ')}`);

// ── 4. Latest builds — is anything actually shippable? ────────────────────
const bres = await asc(
	'GET',
	`/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,expired`
);
const builds = (bres.json?.data ?? []).map((b) => b.attributes);
const usable = builds.find((b) => b.processingState === 'VALID' && !b.expired);
if (!usable)
	blockers.push(
		`no VALID unexpired build (latest: ${builds.map((b) => b.version + ':' + b.processingState).join(', ') || 'none'})`
	);
else {
	ok.push(`build ${usable.version} is VALID`);
	if (build[0] && usable.version !== build[0])
		warnings.push(
			`local CURRENT_PROJECT_VERSION is ${build[0]} but the newest VALID build is ${usable.version} — upload first`
		);
}

// ── 5. If the target version exists, is it actually complete? ─────────────
const target = TARGET ? versions.find((v) => v.attributes.versionString === TARGET) : null;
if (TARGET && !target) {
	warnings.push(`v${TARGET} does not exist yet in ASC (it will be created at submit time)`);
} else if (target) {
	const id = target.id;
	const b = await asc('GET', `/v1/appStoreVersions/${id}/build?fields[builds]=version`);
	if (!b.json?.data) blockers.push(`v${TARGET} has no build attached`);
	else ok.push(`v${TARGET} has build ${b.json.data.attributes.version} attached`);

	const locs = await asc(
		'GET',
		`/v1/appStoreVersions/${id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,whatsNew`
	);
	for (const l of locs.json?.data ?? []) {
		const { locale, whatsNew } = l.attributes;
		// whatsNew is not editable on a FIRST release — absent is only a blocker later.
		if (!whatsNew && live.length) blockers.push(`v${TARGET} ${locale}: release notes are empty`);
		else ok.push(`v${TARGET} ${locale}: release notes present`);

		const sets = await asc(
			'GET',
			`/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets?limit=10`
		);
		for (const s of sets.json?.data ?? []) {
			const shots = await asc('GET', `/v1/appScreenshotSets/${s.id}/appScreenshots?limit=50`);
			const rows = shots.json?.data ?? [];
			const bad = rows.filter((r) => r.attributes.assetDeliveryState?.state !== 'COMPLETE');
			const type = s.attributes.screenshotDisplayType;
			if (!rows.length) blockers.push(`v${TARGET} ${type}: no screenshots`);
			else if (bad.length)
				blockers.push(`v${TARGET} ${type}: ${bad.length} screenshot(s) not COMPLETE`);
			else ok.push(`v${TARGET} ${type}: ${rows.length} screenshots COMPLETE`);
		}
	}
}

// ── 6. Things the API cannot see — must be stated, not silently assumed ───
warnings.push(
	'NOT API-CHECKABLE: App Privacy answers and Pricing. Both are web-UI only ' +
		'(/v1/appDataUsages 404s) and both surface as a 409 at submit if unset. ' +
		'chawan ships "Data Not Collected" (it is local-only) — already published once, ' +
		'and these persist per-app.'
);

const line = '-'.repeat(52);
console.log(`\n${line}\nPASS (${ok.length})`);
for (const o of ok) console.log(`  ✓ ${o}`);
if (warnings.length) {
	console.log(`\nWARN (${warnings.length})`);
	for (const w of warnings) console.log(`  ! ${w}`);
}
if (blockers.length) {
	console.log(`\nBLOCKERS (${blockers.length})`);
	for (const b of blockers) console.log(`  ✗ ${b}`);
	console.log(`\n${line}\nNOT clear to ship.`);
	process.exit(1);
}
console.log(`\n${line}\nClear to ship.`);
