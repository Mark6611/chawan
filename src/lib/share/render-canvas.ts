// Canvas renderer for share cards. Phase 5, Session 20: square session
// cards (personal + café). Stat / palate / story land in Session 21.
//
// Everything is drawn in 1080-unit space; ctx.scale(S, S) handles the
// output resolution (S=3 → 3240² export, S=1 → preview). Colors are the
// FIXED night card palette — the card never follows the in-app theme.
//
// All positions/sizes follow share-spec.md. Canvas drawing is imperative,
// so this is verbose by nature; the structure mirrors the spec's blocks.

import type {
	PalateCardData,
	SessionCardData,
	ShareCardData,
	ShareMetric,
	StatCardData
} from './share-card';
import { BRANDS } from '$lib/catalog/brands';
import type { BrandGlyphShape } from '$lib/catalog/types';

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
	drawMakerBar(ctx, data.date);
	drawSignOff(ctx);

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
	top: number,
	r = 11, // ø22 square / ø26 story (r=13)
	gap = 14
): void {
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

// ─── Maker bar + sign-off (shared by all square cards) ──────

function drawMakerBar(ctx: CanvasRenderingContext2D, date: string): void {
	drawEnso(ctx, SQ.left + 18, 88 + 18, 36, NIGHT.inkMid, 1.6);
	trackedText(ctx, 'CHAWAN', 146, 96, `500 21px "${MONO}"`, NIGHT.inkMid, 0.3, 21, 'left');
	trackedText(
		ctx,
		date.toUpperCase(),
		SQ.right,
		96,
		`400 21px "${MONO}"`,
		NIGHT.inkLow,
		0.22,
		21,
		'right'
	);
}

function drawSignOff(ctx: CanvasRenderingContext2D): void {
	drawEnso(ctx, SQ.center, 985, 30, NIGHT.tea);
}

/** Centered (non-tracked) text. Returns the y advanced past the block. */
function centeredText(
	ctx: CanvasRenderingContext2D,
	lines: string[],
	top: number,
	font: string,
	color: string,
	lineH: number
): number {
	ctx.save();
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	lines.forEach((ln, i) => ctx.fillText(ln, SQ.center, top + i * lineH));
	ctx.restore();
	return top + lines.length * lineH;
}

// ─── Brand glyph + flavor chart on canvas ───────────────────

function drawBrandGlyph(
	ctx: CanvasRenderingContext2D,
	shape: BrandGlyphShape,
	cx: number,
	cy: number,
	r: number,
	color: string
): void {
	ctx.save();
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineWidth = Math.max(1.5, r * 0.28);
	ctx.beginPath();
	if (shape === 'disc') {
		ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
		ctx.fill();
	} else if (shape === 'ring') {
		ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
		ctx.stroke();
	} else if (shape === 'diamond') {
		ctx.moveTo(cx, cy - r);
		ctx.lineTo(cx + r, cy);
		ctx.lineTo(cx, cy + r);
		ctx.lineTo(cx - r, cy);
		ctx.closePath();
		ctx.fill();
	} else if (shape === 'triangle') {
		const t = r * 0.95;
		ctx.moveTo(cx, cy - t);
		ctx.lineTo(cx + t * 0.866, cy + t * 0.5);
		ctx.lineTo(cx - t * 0.866, cy + t * 0.5);
		ctx.closePath();
		ctx.fill();
	} else {
		// square-open
		const s = r * 0.78;
		ctx.rect(cx - s, cy - s, s * 2, s * 2);
		ctx.stroke();
	}
	ctx.restore();
}

/** Imperative flavor chart — ±1 axes, locked, the user's plotted tins as
 *  brand glyphs. Reuses FlavorChart's projection; avoids SVG-serialization
 *  + font-embedding by drawing directly. */
function drawMiniChart(
	ctx: CanvasRenderingContext2D,
	products: PalateCardData['products'],
	ox: number,
	oy: number,
	box: number
): void {
	const projX = (x: number) => ox + ((x + 1) / 2) * box;
	const projY = (y: number) => oy + ((1 - y) / 2) * box;

	// frame
	ctx.save();
	ctx.strokeStyle = NIGHT.hairline;
	ctx.lineWidth = 1;
	ctx.strokeRect(ox, oy, box, box);

	// half-grid (dashed ±0.5)
	ctx.setLineDash([2, 5]);
	for (const v of [-0.5, 0.5]) {
		ctx.beginPath();
		ctx.moveTo(ox, projY(v));
		ctx.lineTo(ox + box, projY(v));
		ctx.moveTo(projX(v), oy);
		ctx.lineTo(projX(v), oy + box);
		ctx.stroke();
	}
	ctx.setLineDash([]);

	// center cross
	ctx.globalAlpha = 0.9;
	ctx.beginPath();
	ctx.moveTo(ox, projY(0));
	ctx.lineTo(ox + box, projY(0));
	ctx.moveTo(projX(0), oy);
	ctx.lineTo(projX(0), oy + box);
	ctx.stroke();
	ctx.globalAlpha = 1;
	ctx.restore();

	// axis labels
	const lab = `500 18px "${MONO}"`;
	trackedText(ctx, 'FULL-BODY', SQ.center, oy - 30, lab, NIGHT.inkLow, 0.18, 18, 'center');
	trackedText(ctx, 'REFRESHING', SQ.center, oy + box + 12, lab, NIGHT.inkLow, 0.18, 18, 'center');
	ctx.save();
	ctx.translate(ox - 14, oy + box / 2);
	ctx.rotate(-Math.PI / 2);
	trackedText(ctx, 'SHARP', 0, 0, lab, NIGHT.inkLow, 0.18, 18, 'center');
	ctx.restore();
	ctx.save();
	ctx.translate(ox + box + 14, oy + box / 2);
	ctx.rotate(Math.PI / 2);
	trackedText(ctx, 'MILD', 0, 0, lab, NIGHT.inkLow, 0.18, 18, 'center');
	ctx.restore();

	// dots — the user's tins, each in its brand glyph, in tea
	const r = Math.max(7, box * 0.016);
	for (const p of products) {
		const shape = BRANDS[p.brand]?.glyph ?? 'disc';
		drawBrandGlyph(ctx, shape, projX(p.taste.x), projY(p.taste.y), r, NIGHT.tea);
	}
}

// ─── Palate card ────────────────────────────────────────────

function drawPalateCard(ctx: CanvasRenderingContext2D, data: PalateCardData): void {
	drawMakerBar(ctx, data.date);
	drawSignOff(ctx);

	const box = 520;
	const phraseLines = data.phrase.split('\n');
	const phraseSize = 64;
	const phraseLineH = phraseSize * 1.05;

	// measure stack: eyebrow(21) + 30 + chart(box) + 48 + phrase + 20 + sub(24)
	const stackH = 21 + 30 + box + 48 + phraseLines.length * phraseLineH + 20 + 24;
	const avail = SQ.availBottom - SQ.availTop;
	let y = SQ.availTop + Math.max(0, (avail - stackH) / 2);

	trackedText(ctx, 'MY PALATE', SQ.center, y, `500 21px "${MONO}"`, NIGHT.tea, 0.22, 21, 'center');
	y += 21 + 30;

	drawMiniChart(ctx, data.products, SQ.center - box / 2, y, box);
	y += box + 48;

	y = centeredText(
		ctx,
		phraseLines,
		y,
		`italic 400 ${phraseSize}px "${DISPLAY}"`,
		NIGHT.ink,
		phraseLineH
	);
	y += 20;

	centeredText(ctx, [data.sub], y, `400 24px "${MONO}"`, NIGHT.inkMid, 24);
}

// ─── Stat card ──────────────────────────────────────────────

function drawStatCard(ctx: CanvasRenderingContext2D, data: StatCardData): void {
	drawMakerBar(ctx, data.date);
	drawSignOff(ctx);

	const figureSize = 300;
	const figureH = figureSize * 0.84;
	const captionLines = data.caption.split('\n');
	const captionSize = 56;
	const captionLineH = captionSize * 1.1;

	const stackH =
		21 + 36 + figureH + 56 + captionLines.length * captionLineH + (data.sub ? 24 + 24 : 0);
	const avail = SQ.availBottom - SQ.availTop;
	let y = SQ.availTop + Math.max(0, (avail - stackH) / 2);

	// eyebrow
	trackedText(ctx, data.eyebrow, SQ.center, y, `500 21px "${MONO}"`, NIGHT.tea, 0.22, 21, 'center');
	y += 21 + 36;

	// figure (+ unit baseline-aligned, group centered)
	ctx.save();
	ctx.textBaseline = 'alphabetic';
	ctx.font = `300 ${figureSize}px "${MONO}"`;
	const fw = ctx.measureText(data.figure).width;
	ctx.font = `italic 400 64px "${DISPLAY}"`;
	const uw = data.unit ? ctx.measureText(' ' + data.unit).width : 0;
	const groupW = fw + uw;
	const baseline = y + figureH * 0.82;
	const startX = SQ.center - groupW / 2;
	ctx.textAlign = 'left';
	ctx.font = `300 ${figureSize}px "${MONO}"`;
	ctx.fillStyle = NIGHT.ink;
	ctx.fillText(data.figure, startX, baseline);
	if (data.unit) {
		ctx.font = `italic 400 64px "${DISPLAY}"`;
		ctx.fillStyle = NIGHT.inkMid;
		ctx.fillText(' ' + data.unit, startX + fw, baseline);
	}
	ctx.restore();
	y += figureH + 56;

	// caption
	y = centeredText(
		ctx,
		captionLines,
		y,
		`italic 400 ${captionSize}px "${DISPLAY}"`,
		NIGHT.inkMid,
		captionLineH
	);

	// sub
	if (data.sub) {
		y += 24;
		centeredText(ctx, [data.sub], y, `400 24px "${MONO}"`, NIGHT.inkMid, 24);
	}
}

// ─── Story format (1080 × 1920) ─────────────────────────────

const ST = {
	W: 1080,
	H: 1920,
	left: 110,
	right: 970,
	center: 540,
	contentW: 860,
	availTop: 320, // below the centered header
	availBottom: 1680 // above the sign-off
};

/** Centered header: ensō + CHAWAN + date, stacked at the top. */
function storyHeader(ctx: CanvasRenderingContext2D, date: string): void {
	drawEnso(ctx, ST.center, 182, 64, NIGHT.inkMid, 2.6);
	trackedText(ctx, 'CHAWAN', ST.center, 230, `500 24px "${MONO}"`, NIGHT.inkMid, 0.34, 24, 'center');
	trackedText(
		ctx,
		date.toUpperCase(),
		ST.center,
		266,
		`400 20px "${MONO}"`,
		NIGHT.inkLow,
		0.22,
		20,
		'center'
	);
}

/** "A FILE, NOT A FEED" sign-off with a short vertical hairline above. */
function storySignOff(ctx: CanvasRenderingContext2D): void {
	ctx.save();
	ctx.strokeStyle = NIGHT.hairline;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(ST.center + 0.5, 1716);
	ctx.lineTo(ST.center + 0.5, 1780);
	ctx.stroke();
	ctx.restore();
	trackedText(
		ctx,
		'A FILE, NOT A FEED',
		ST.center,
		1800,
		`500 18px "${MONO}"`,
		NIGHT.inkFaint,
		0.22,
		18,
		'center'
	);
}

function drawSessionStory(ctx: CanvasRenderingContext2D, data: SessionCardData): void {
	storyHeader(ctx, data.date);
	storySignOff(ctx);

	const titleSize = data.kind === 'session-cafe' ? 132 : 168;
	const eyebrow = data.kind === 'session-cafe' ? 'CAFÉ' : 'PERSONAL';
	const hasRating = !!data.rating && data.rating > 0;
	const hasNotes = !!data.notes && data.notes.trim().length > 0;

	ctx.font = `italic 400 ${titleSize}px "${DISPLAY}"`;
	const titleLines = wrapText(ctx, data.title, ST.contentW);
	const titleLineH = titleSize * 0.98;

	let noteLines: string[] = [];
	const noteSize = 44;
	const noteLineH = noteSize * 1.5;
	if (hasNotes) {
		ctx.font = `italic 400 ${noteSize}px "${BODY}"`;
		noteLines = wrapText(ctx, `“${data.notes!.trim()}”`, Math.min(760, ST.contentW));
	}

	// metrics 2-col grid
	const cols = 2;
	const colGap = 64;
	const colW = (ST.contentW - colGap) / cols;
	const cellH = 20 + 14 + 92; // label + gap + value
	const rowGap = 70;
	const rows = Math.ceil(data.metrics.length / cols);
	const metricsH = rows * cellH + (rows - 1) * rowGap;

	const hairlineGap = 76;
	const total =
		22 + // eyebrow
		26 +
		titleLines.length * titleLineH +
		24 +
		30 + // sub
		hairlineGap +
		1 +
		hairlineGap +
		metricsH +
		(hasRating ? 56 + 26 : 0) +
		(hasNotes ? (hasRating ? 48 : 60) + noteLines.length * noteLineH : 0);

	const avail = ST.availBottom - ST.availTop;
	let y = ST.availTop + Math.max(0, (avail - total) / 2);

	trackedText(ctx, eyebrow, ST.left, y, `500 22px "${MONO}"`, NIGHT.tea, 0.22, 22);
	y += 22 + 26;

	ctx.save();
	ctx.font = `italic 400 ${titleSize}px "${DISPLAY}"`;
	ctx.fillStyle = NIGHT.ink;
	ctx.textBaseline = 'top';
	titleLines.forEach((ln, i) => ctx.fillText(ln, ST.left, y + i * titleLineH));
	ctx.restore();
	y += titleLines.length * titleLineH + 24;

	ctx.save();
	ctx.font = `400 30px "${MONO}"`;
	ctx.fillStyle = NIGHT.inkMid;
	ctx.textBaseline = 'top';
	ctx.fillText(data.sub, ST.left, y);
	ctx.restore();
	y += 30 + hairlineGap;

	ctx.save();
	ctx.strokeStyle = NIGHT.hairline;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(ST.left, y + 0.5);
	ctx.lineTo(ST.left + 160, y + 0.5);
	ctx.stroke();
	ctx.restore();
	y += 1 + hairlineGap;

	// metric grid
	data.metrics.forEach((m, i) => {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const cx = ST.left + col * (colW + colGap);
		const cellTop = y + row * (cellH + rowGap);
		trackedText(ctx, m.label.toUpperCase(), cx, cellTop, `500 20px "${MONO}"`, NIGHT.inkLow, 0.22, 20);
		const baseline = cellTop + 20 + 14 + 92 * 0.76;
		ctx.save();
		ctx.textBaseline = 'alphabetic';
		ctx.font = `300 92px "${MONO}"`;
		ctx.fillStyle = m.accent ? NIGHT.tea : NIGHT.ink;
		ctx.fillText(m.value, cx, baseline);
		const vw = ctx.measureText(m.value).width;
		if (m.unit) {
			ctx.font = `400 30px "${MONO}"`;
			ctx.fillStyle = NIGHT.inkLow;
			ctx.fillText(m.unit, cx + vw + 8, baseline);
		}
		ctx.restore();
	});
	y += metricsH;

	if (hasRating) {
		y += 56;
		drawRating(ctx, data.rating!, ST.left, y, 13, 16);
		y += 26;
	}

	if (hasNotes) {
		y += hasRating ? 48 : 60;
		ctx.save();
		ctx.font = `italic 400 ${noteSize}px "${BODY}"`;
		ctx.fillStyle = NIGHT.inkMid;
		ctx.textBaseline = 'top';
		noteLines.forEach((ln, i) => ctx.fillText(ln, ST.left, y + i * noteLineH));
		ctx.restore();
	}
}

function drawPalateStory(ctx: CanvasRenderingContext2D, data: PalateCardData): void {
	storyHeader(ctx, data.date);
	storySignOff(ctx);

	const box = 720;
	const phraseLines = data.phrase.split('\n');
	const phraseSize = 92;
	const phraseLineH = phraseSize * 1.04;

	const total = 22 + 40 + box + 64 + phraseLines.length * phraseLineH + 24 + 28;
	const avail = ST.availBottom - ST.availTop;
	let y = ST.availTop + Math.max(0, (avail - total) / 2);

	trackedText(ctx, 'MY PALATE', ST.center, y, `500 22px "${MONO}"`, NIGHT.tea, 0.22, 22, 'center');
	y += 22 + 40;

	drawMiniChart(ctx, data.products, ST.center - box / 2, y, box);
	y += box + 64;

	y = centeredText(
		ctx,
		phraseLines,
		y,
		`italic 400 ${phraseSize}px "${DISPLAY}"`,
		NIGHT.ink,
		phraseLineH
	);
	y += 24;
	centeredText(ctx, [data.sub], y, `400 28px "${MONO}"`, NIGHT.inkMid, 28);
}

// ─── Public API ──────────────────────────────────────────────

/** Draw a card onto a provided canvas at the given scale (1 = preview,
 *  3 = export). Sizes the canvas, loads fonts, fills the bg, dispatches. */
export async function drawShareCard(
	canvas: HTMLCanvasElement,
	data: ShareCardData,
	scale = 1
): Promise<void> {
	await ensureFonts();

	const story = data.format === 'story';
	if (story && data.kind === 'stat') throw new Error('The stat card has no story variant.');

	const W = 1080;
	const H = story ? 1920 : 1080;
	canvas.width = W * scale;
	canvas.height = H * scale;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas context unavailable.');
	ctx.scale(scale, scale);

	// Background
	ctx.fillStyle = NIGHT.paper;
	ctx.fillRect(0, 0, W, H);

	if (story) {
		if (data.kind === 'palate') drawPalateStory(ctx, data);
		else if (data.kind === 'session-personal' || data.kind === 'session-cafe')
			drawSessionStory(ctx, data);
	} else if (data.kind === 'palate') {
		drawPalateCard(ctx, data);
	} else if (data.kind === 'stat') {
		drawStatCard(ctx, data);
	} else {
		drawSessionCard(ctx, data);
	}
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
