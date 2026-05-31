// Canvas renderer for share cards. Phase 5, Session 20: square session
// cards (personal + café). Stat / palate / story land in Session 21.
//
// Everything is drawn in 1080-unit space; ctx.scale(S, S) handles the
// output resolution (S=3 → 3240² export, S=1 → preview). Colors are the
// FIXED night card palette — the card never follows the in-app theme.
//
// All positions/sizes follow share-spec.md. Canvas drawing is imperative,
// so this is verbose by nature; the structure mirrors the spec's blocks.

import type { ShareCardData, SessionCardData, ShareMetric } from './share-card';

const NIGHT = {
	paper: '#161b16',
	ink: '#f3f0e9',
	inkMid: '#b6ad9e',
	inkLow: '#867d6f',
	inkFaint: '#5a5249',
	tea: '#67ac7d',
	hairline: 'rgba(225,230,220,0.13)'
};

const MONO = 'IBM Plex Mono';
const DISPLAY = 'Cormorant Garamond';
const BODY = 'EB Garamond';

// ─── Font preload ────────────────────────────────────────────
async function ensureFonts(): Promise<void> {
	if (typeof document === 'undefined' || !document.fonts) return;
	try {
		await Promise.all([
			document.fonts.load(`italic 400 132px "${DISPLAY}"`),
			document.fonts.load(`italic 400 38px "${BODY}"`),
			document.fonts.load(`300 74px "${MONO}"`),
			document.fonts.load(`500 21px "${MONO}"`)
		]);
		await document.fonts.ready;
	} catch {
		// Fonts may fail to report; draw anyway with whatever's available.
	}
}

// ─── Primitives ──────────────────────────────────────────────

/** Ensō arc per the brand recipe: 85% stroke / 15% gap at lower-right. */
function drawEnso(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	box: number,
	color: string,
	strokeW?: number
): void {
	const r = box * 0.293;
	ctx.save();
	ctx.lineWidth = strokeW ?? box * 0.045;
	ctx.lineCap = 'round';
	ctx.strokeStyle = color;
	const gapCenter = Math.PI / 4; // 45° lower-right (screen coords)
	const half = ((54 * Math.PI) / 180) / 2;
	ctx.beginPath();
	ctx.arc(cx, cy, r, gapCenter + half, gapCenter - half + Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

type Align = 'left' | 'right' | 'center';

/** Text with manual letter-spacing (em). Canvas letterSpacing support is
 *  uneven, and we need right/center alignment, so advance per char. */
function trackedText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	font: string,
	color: string,
	emTracking: number,
	sizePx: number,
	align: Align = 'left'
): void {
	ctx.save();
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.textBaseline = 'top';
	const track = emTracking * sizePx;
	const chars = [...text];
	const widths = chars.map((c) => ctx.measureText(c).width);
	const total = widths.reduce((a, w) => a + w, 0) + track * Math.max(0, chars.length - 1);
	let cx = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
	for (let i = 0; i < chars.length; i++) {
		ctx.fillText(chars[i], cx, y);
		cx += widths[i] + track;
	}
	ctx.restore();
}

/** Greedy word wrap to a max width, given a font already set on ctx. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let line = '';
	for (const w of words) {
		const test = line ? `${line} ${w}` : w;
		if (ctx.measureText(test).width > maxWidth && line) {
			lines.push(line);
			line = w;
		} else {
			line = test;
		}
	}
	if (line) lines.push(line);
	return lines;
}

// ─── Square session card ─────────────────────────────────────

const SQ = {
	W: 1080,
	H: 1080,
	left: 96,
	right: 984,
	center: 540,
	contentW: 888,
	availTop: 150,
	availBottom: 940
};

interface Block {
	height: number;
	draw: (top: number) => void;
}

function drawSessionCard(ctx: CanvasRenderingContext2D, data: SessionCardData): void {
	// ── Maker bar ──
	drawEnso(ctx, SQ.left + 18, 88 + 18, 36, NIGHT.inkMid, 1.6);
	trackedText(ctx, 'CHAWAN', 146, 96, `500 21px "${MONO}"`, NIGHT.inkMid, 0.3, 21, 'left');
	trackedText(
		ctx,
		data.date.toUpperCase(),
		SQ.right,
		96,
		`400 21px "${MONO}"`,
		NIGHT.inkLow,
		0.22,
		21,
		'right'
	);

	// ── Sign-off ensō (centered, near bottom) ──
	drawEnso(ctx, SQ.center, 985, 30, NIGHT.tea);

	// ── Body blocks (measured, then vertically centered in avail) ──
	const titleSize = data.kind === 'session-cafe' ? 104 : 132;
	const eyebrow = data.kind === 'session-cafe' ? 'CAFÉ' : 'PERSONAL';
	const hasRating = !!data.rating && data.rating > 0;
	const hasNotes = !!data.notes && data.notes.trim().length > 0;

	// Title wrap measurement
	ctx.font = `italic 400 ${titleSize}px "${DISPLAY}"`;
	const titleLines = wrapText(ctx, data.title, SQ.contentW);
	const titleLineH = titleSize * 0.98;

	// Notes wrap measurement
	let noteLines: string[] = [];
	const noteSize = 38;
	const noteLineH = noteSize * 1.5;
	if (hasNotes) {
		ctx.font = `italic 400 ${noteSize}px "${BODY}"`;
		noteLines = wrapText(ctx, `“${data.notes!.trim()}”`, SQ.contentW);
	}

	const blocks: Block[] = [];

	// Eyebrow
	blocks.push({
		height: 21,
		draw: (top) =>
			trackedText(ctx, eyebrow, SQ.left, top, `500 21px "${MONO}"`, NIGHT.tea, 0.22, 21)
	});
	// gap 22 baked as spacer below
	blocks.push(spacer(22));

	// Title
	blocks.push({
		height: titleLines.length * titleLineH,
		draw: (top) => {
			ctx.save();
			ctx.font = `italic 400 ${titleSize}px "${DISPLAY}"`;
			ctx.fillStyle = NIGHT.ink;
			ctx.textBaseline = 'top';
			titleLines.forEach((ln, i) => ctx.fillText(ln, SQ.left, top + i * titleLineH));
			ctx.restore();
		}
	});
	blocks.push(spacer(20));

	// Sub
	blocks.push({
		height: 26,
		draw: (top) => {
			ctx.save();
			ctx.font = `400 26px "${MONO}"`;
			ctx.fillStyle = NIGHT.inkMid;
			ctx.textBaseline = 'top';
			ctx.fillText(data.sub, SQ.left, top);
			ctx.restore();
		}
	});
	blocks.push(spacer(56));

	// Hairline
	blocks.push({
		height: 1,
		draw: (top) => {
			ctx.save();
			ctx.strokeStyle = NIGHT.hairline;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(SQ.left, top + 0.5);
			ctx.lineTo(SQ.right, top + 0.5);
			ctx.stroke();
			ctx.restore();
		}
	});
	blocks.push(spacer(56));

	// Metric row
	const metricsH = 19 + 14 + 74; // label + gap + value
	blocks.push({
		height: metricsH,
		draw: (top) => drawMetrics(ctx, data.metrics, top, metricsH)
	});

	// Rating
	if (hasRating) {
		blocks.push(spacer(52));
		blocks.push({ height: 22, draw: (top) => drawRating(ctx, data.rating!, SQ.left, top) });
	}

	// Notes
	if (hasNotes) {
		blocks.push(spacer(hasRating ? 40 : 52));
		blocks.push({
			height: noteLines.length * noteLineH,
			draw: (top) => {
				ctx.save();
				ctx.font = `italic 400 ${noteSize}px "${BODY}"`;
				ctx.fillStyle = NIGHT.inkMid;
				ctx.textBaseline = 'top';
				noteLines.forEach((ln, i) => ctx.fillText(ln, SQ.left, top + i * noteLineH));
				ctx.restore();
			}
		});
	}

	const total = blocks.reduce((a, b) => a + b.height, 0);
	const avail = SQ.availBottom - SQ.availTop;
	let y = SQ.availTop + Math.max(0, (avail - total) / 2);
	for (const b of blocks) {
		b.draw(y);
		y += b.height;
	}
}

function spacer(h: number): Block {
	return { height: h, draw: () => {} };
}

function drawMetrics(
	ctx: CanvasRenderingContext2D,
	metrics: ShareMetric[],
	top: number,
	blockH: number
): void {
	const n = metrics.length;
	const colW = SQ.contentW / n;
	const valueBaseline = top + 19 + 14 + 74 * 0.76; // alphabetic baseline of the value row

	metrics.forEach((m, i) => {
		const colX = SQ.left + colW * i;
		const pad = 2;

		// vertical hairline between columns
		if (i > 0) {
			ctx.save();
			ctx.strokeStyle = NIGHT.hairline;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(colX + 0.5, top);
			ctx.lineTo(colX + 0.5, top + blockH);
			ctx.stroke();
			ctx.restore();
		}

		// label (tracked, top baseline)
		trackedText(
			ctx,
			m.label.toUpperCase(),
			colX + pad,
			top,
			`500 19px "${MONO}"`,
			NIGHT.inkLow,
			0.22,
			19
		);

		// value + unit (alphabetic baseline so they sit on the same line)
		ctx.save();
		ctx.textBaseline = 'alphabetic';
		ctx.font = `300 74px "${MONO}"`;
		ctx.fillStyle = m.accent ? NIGHT.tea : NIGHT.ink;
		ctx.fillText(m.value, colX + pad, valueBaseline);
		const vw = ctx.measureText(m.value).width;
		if (m.unit) {
			ctx.font = `400 26px "${MONO}"`;
			ctx.fillStyle = NIGHT.inkLow;
			ctx.fillText(m.unit, colX + pad + vw + 8, valueBaseline);
		}
		ctx.restore();
	});
}

function drawRating(
	ctx: CanvasRenderingContext2D,
	rating: number,
	x: number,
	top: number
): void {
	const r = 11; // ø22
	const gap = 14;
	const cy = top + r;
	for (let i = 0; i < 5; i++) {
		const cx = x + r + i * (r * 2 + gap);
		const filled = rating >= i + 1;
		const half = rating >= i + 0.5 && rating < i + 1;
		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		if (filled) {
			ctx.fillStyle = NIGHT.tea;
			ctx.fill();
		} else if (half) {
			// left half tea, ring on the rest
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, r, Math.PI / 2, (Math.PI * 3) / 2);
			ctx.fillStyle = NIGHT.tea;
			ctx.fill();
			ctx.restore();
			ctx.beginPath();
			ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
			ctx.strokeStyle = NIGHT.inkFaint;
			ctx.lineWidth = 2;
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
			ctx.strokeStyle = NIGHT.inkFaint;
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		ctx.restore();
	}
}

// ─── Public API ──────────────────────────────────────────────

/** Draw a card onto a provided canvas at the given scale (1 = preview,
 *  3 = export). Sizes the canvas, loads fonts, fills the bg, dispatches. */
export async function drawShareCard(
	canvas: HTMLCanvasElement,
	data: ShareCardData,
	scale = 1
): Promise<void> {
	if (data.format === 'story') throw new Error('Story format lands in Session 21.');
	if (data.kind === 'palate' || data.kind === 'stat') {
		throw new Error(`Card kind "${data.kind}" lands in Session 21.`);
	}

	await ensureFonts();

	const w = SQ.W * scale;
	const h = SQ.H * scale;
	canvas.width = w;
	canvas.height = h;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas context unavailable.');
	ctx.scale(scale, scale);

	// Background
	ctx.fillStyle = NIGHT.paper;
	ctx.fillRect(0, 0, SQ.W, SQ.H);

	drawSessionCard(ctx, data);
}

/** Render a card to a PNG Blob. Default 3× (3240²) for export crispness. */
export async function renderShareCard(data: ShareCardData, scale = 3): Promise<Blob> {
	const canvas = document.createElement('canvas');
	await drawShareCard(canvas, data, scale);
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error('toBlob returned null.'));
		}, 'image/png');
	});
}
