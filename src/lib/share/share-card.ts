// Share-card payload types + builders + the share/download handoff.
// Phase 5. The card is a FILE, not a network: render → PNG Blob → the
// platform share sheet (Web Share API level 2 with files) or a download
// fallback. No upload, no hosted link.
//
// Adapted from Design's share/share-card.ts to the shipped schema:
//   - StoreSession → CafeSession, storeName → cafeName
//   - the stub formatPrice → the real 7-currency one in sessions/currency
//   - enum labels via the *_LABELS maps
//
// See docs / the handoff share-spec.md for the exact 1080-grid layout
// each renderer draws.

import {
	MILK_LABELS,
	REGION_LABELS,
	STYLE_LABELS,
	type CafeSession,
	type PersonalSession,
	type Tin
} from '$lib/db/types';
import type { CatalogEntry } from '$lib/catalog/types';
import { formatPrice } from '$lib/sessions/currency';

// ─────────────────────────────────────────────────────────────
// Card kinds + format
// ─────────────────────────────────────────────────────────────

export type ShareKind = 'session-personal' | 'session-cafe' | 'palate' | 'stat';
export type ShareFormat = 'square' | 'story'; // 1080² | 1080×1920

/** One metric cell in the big-mono row. */
export interface ShareMetric {
	label: string; // "POWDER" — the card uppercases it
	value: string; // "2.0" — pre-formatted; the card does not compute
	unit?: string; // "g", "°", undefined
	accent?: boolean; // render value in tea (ratio, price)
}

interface ShareCardBase {
	date: string; // "20 May 2026" — DATE ONLY, never a time (privacy)
	format: ShareFormat;
}

export interface SessionCardData extends ShareCardBase {
	kind: 'session-personal' | 'session-cafe';
	title: string;
	sub: string;
	metrics: ShareMetric[];
	rating?: number; // 0–5; omit dots if undefined / 0
	notes?: string; // omit block if undefined; card wraps in curly quotes
}

export interface PalateCardData extends ShareCardBase {
	kind: 'palate';
	products: (CatalogEntry & { taste: { x: number; y: number } })[];
	phrase: string;
	sub: string;
}

export interface StatCardData extends ShareCardBase {
	kind: 'stat';
	eyebrow: string;
	figure: string;
	unit?: string;
	caption: string;
	sub?: string;
}

export type ShareCardData = SessionCardData | PalateCardData | StatCardData;

// ─────────────────────────────────────────────────────────────
// Builders — domain object → card payload
// ─────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO timestamp → "20 May 2026". Date only — never the time (privacy). */
export function shareDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildPersonalCard(
	s: PersonalSession,
	tin: Tin,
	format: ShareFormat = 'square'
): SessionCardData {
	const ratio = s.powderGrams > 0 ? s.waterGrams / s.powderGrams : 0;
	return {
		kind: 'session-personal',
		format,
		date: shareDate(s.brewedAt),
		title: STYLE_LABELS[s.style],
		sub: `${tin.name} · ${tin.maker}`,
		metrics: [
			{ label: 'Powder', value: s.powderGrams.toFixed(1), unit: 'g' },
			{ label: 'Water', value: String(s.waterGrams), unit: 'g' },
			{ label: 'Temp', value: String(s.waterTempC), unit: '°' },
			{
				label: 'Ratio',
				value: ratio ? `1:${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}` : '—',
				accent: true
			}
		],
		rating: s.rating,
		notes: s.notes
	};
}

export function buildCafeCard(s: CafeSession, format: ShareFormat = 'square'): SessionCardData {
	const metrics: ShareMetric[] = [
		{ label: 'Style', value: s.style === 'latte' ? 'Latte' : 'Clear' }
	];
	if (s.style === 'latte' && s.milk) metrics.push({ label: 'Milk', value: MILK_LABELS[s.milk] });
	if (s.priceCents != null) {
		metrics.push({
			label: 'Price',
			value: formatPrice(s.priceCents, s.priceCurrency ?? 'THB'),
			accent: true
		});
	} else {
		// Edge case — no price: swap in region rather than leaving a hole.
		metrics.push({ label: 'Region', value: REGION_LABELS[s.region] });
	}
	return {
		kind: 'session-cafe',
		format,
		date: shareDate(s.brewedAt),
		title: s.cafeName,
		sub: s.maker ? `${REGION_LABELS[s.region]} · ${s.maker}` : REGION_LABELS[s.region],
		metrics,
		rating: s.rating,
		notes: s.notes
	};
}

/** Centroid of plotted tins → a short two-line phrase. Near-zero axes
 *  are omitted. Card-specific copy (the Insights inline uses its own,
 *  terser palatePhrase). */
export function derivePalatePhrase(products: { taste: { x: number; y: number } }[]): string {
	if (!products.length) return 'A palate\nstill forming.';
	const n = products.length;
	const cx = products.reduce((a, p) => a + p.taste.x, 0) / n;
	const cy = products.reduce((a, p) => a + p.taste.y, 0) / n;
	const xClause = cx > 0.2 ? 'mild' : cx < -0.2 ? 'sharp' : null;
	const yClause = cy > 0.2 ? 'full-bodied' : cy < -0.2 ? 'refreshing' : null;
	if (xClause && yClause) return `Mostly ${xClause},\nand ${yClause}.`;
	if (xClause) return `Mostly\n${xClause}.`;
	if (yClause) return `Mostly\n${yClause}.`;
	return 'Right down\nthe middle.';
}

// ─────────────────────────────────────────────────────────────
// Filename + handoff
// ─────────────────────────────────────────────────────────────

/** User-visible filename: "Usucha · 20 May 2026.png", filesystem-safe.
 *  Title + date are sanitized separately so an empty title doesn't leave
 *  a dangling "· " — it falls back to the date (or "Chawan"). */
export function shareFilename(title: string, date: string): string {
	const clean = (s: string) => s.replace(/[/\\:*?"<>|]/g, '').trim();
	const t = clean(title);
	const d = clean(date);
	const base = t ? `${t} · ${d}` : d || 'Chawan';
	return `${base}.png`;
}

/** Hand the PNG to the platform.
 *  • Native (Capacitor/WKWebView): the native share sheet via @capacitor/share.
 *    Web Share with files is unreliable in WKWebView and a programmatic blob
 *    download has no download manager there, so the card would never reach
 *    Photos/Messages/AirDrop — route through the plugin (writing a temp file).
 *  • Web: Web Share API level 2 if files are supported (iOS Safari 16.4+,
 *    Android Chrome); else a direct download.
 *  NO upload, NO hosted link. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
	const { Capacitor } = await import('@capacitor/core');
	if (Capacitor.isNativePlatform()) {
		// On native we do NOT fall back to the web download path — it doesn't
		// work in WKWebView. A genuine failure surfaces to the caller; a user
		// cancel is swallowed inside shareNative.
		await shareNative(blob, filename);
		return;
	}

	// Use the blob's own MIME (PNG for share cards, application/json for a
	// backup) so a shared file is labelled correctly on the receiving side.
	const file = new File([blob], filename, { type: blob.type || 'image/png' });
	const nav = navigator as Navigator & {
		canShare?: (data?: ShareData) => boolean;
	};
	if (nav.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file] } as ShareData);
			return;
		} catch (e) {
			// User cancelled the sheet, or share failed — fall through to download
			// only on genuine failure, not on an AbortError (cancel).
			if (e instanceof DOMException && e.name === 'AbortError') return;
		}
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Native share: write the PNG to the cache dir, then hand its file URI to the
 *  OS share sheet. A user-cancelled sheet resolves quietly. */
async function shareNative(blob: Blob, filename: string): Promise<void> {
	const [{ Filesystem, Directory }, { Share }] = await Promise.all([
		import('@capacitor/filesystem'),
		import('@capacitor/share')
	]);
	const base64 = await blobToBase64(blob);
	const { uri } = await Filesystem.writeFile({
		path: filename,
		data: base64,
		directory: Directory.Cache
	});
	try {
		await Share.share({ files: [uri] });
	} catch (e) {
		// The plugin rejects with a "canceled" message when the user dismisses
		// the sheet — that's not an error worth surfacing.
		const msg = e instanceof Error ? e.message.toLowerCase() : '';
		if (msg.includes('cancel')) return;
		throw e;
	}
}

/** Blob → bare base64 (no data: prefix), for Filesystem.writeFile. */
function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = typeof reader.result === 'string' ? reader.result : '';
			resolve(result.slice(result.indexOf(',') + 1));
		};
		reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'));
		reader.readAsDataURL(blob);
	});
}
