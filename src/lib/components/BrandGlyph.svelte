<script lang="ts">
	// One of five shapes that identifies a brand on the flavor chart, on
	// catalog rows, and in the chart legend. All shapes paint in --color-data
	// (ink in day, tea-green in night) so a single token drives the chart's
	// theme adaptiveness.
	//
	// Pass either a `brand` id (looks up the shape from BRANDS) or a `shape`
	// directly. The chart uses brand; the legend can use either.

	import { BRANDS } from '$lib/catalog/brands';
	import type { BrandGlyphShape, BrandId } from '$lib/catalog/types';

	let {
		brand,
		shape,
		size = 10,
		title
	}: {
		brand?: BrandId;
		shape?: BrandGlyphShape;
		size?: number;
		title?: string;
	} = $props();

	const resolvedShape = $derived(shape ?? (brand ? BRANDS[brand]?.glyph : undefined));

	// Geometry — keep glyphs visually similar in mass even when shape changes.
	const half = $derived(size / 2);
	const filledR = $derived(half * 0.85);
	const ringR = $derived(half * 0.78);
	const diamond = $derived(half * 0.95);
	const triangleR = $derived(half * 0.95);
	const squareHalf = $derived(half * 0.78);
</script>

{#if resolvedShape}
	<svg
		class="brand-glyph"
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		role={title ? 'img' : 'presentation'}
		aria-hidden={!title}
	>
		{#if title}<title>{title}</title>{/if}

		{#if resolvedShape === 'disc'}
			<circle cx={half} cy={half} r={filledR} fill="var(--color-data)" />
		{:else if resolvedShape === 'ring'}
			<circle
				cx={half}
				cy={half}
				r={ringR}
				fill="none"
				stroke="var(--color-data)"
				stroke-width="1.1"
			/>
		{:else if resolvedShape === 'diamond'}
			<polygon
				points={`${half},${half - diamond} ${half + diamond},${half} ${half},${half + diamond} ${half - diamond},${half}`}
				fill="var(--color-data)"
			/>
		{:else if resolvedShape === 'triangle'}
			<polygon
				points={`${half},${half - triangleR} ${half + triangleR * 0.866},${half + triangleR * 0.5} ${half - triangleR * 0.866},${half + triangleR * 0.5}`}
				fill="var(--color-data)"
			/>
		{:else if resolvedShape === 'square-open'}
			<rect
				x={half - squareHalf}
				y={half - squareHalf}
				width={squareHalf * 2}
				height={squareHalf * 2}
				fill="none"
				stroke="var(--color-data)"
				stroke-width="1.1"
			/>
		{/if}
	</svg>
{/if}
