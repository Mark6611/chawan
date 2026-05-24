<script lang="ts">
	// FlavorChart — the 2-axis matcha taste plot. Sharp ↔ Mild on x, Refreshing
	// ↔ Full-body on y. Axes locked to ±1 (never auto-scale). Each plotted
	// product is a brand-specific glyph (disc / ring / diamond / triangle /
	// square-open) painted in --color-data. Selection halo paints in
	// --color-tea (the one place green is allowed in day mode).
	//
	// Sizes:
	//   hero   — 320×320  · dot 9  · axis labels · half-grid · catalog browse
	//   inline — 248×248  · dot 8  · axis labels · no grid   · catalog detail
	//   thumb  —  72×72   · dot 5  · no labels   · no grid   · row chips, future
	//
	// Entries without `taste` are silently ignored — surface them in
	// <NotPlottedRail> outside the chart.

	import { BRANDS } from '$lib/catalog/brands';
	import { hasTaste, type BrandId, type CatalogEntry } from '$lib/catalog/types';

	let {
		products,
		size,
		highlightId,
		labelFor,
		brandFilter,
		ownedIds = [],
		onSelect
	}: {
		products: readonly CatalogEntry[];
		size: 'hero' | 'inline' | 'thumb';
		highlightId?: string;
		labelFor?: string;
		brandFilter?: BrandId;
		/** Catalog ids the user owns (`Tin.catalogId`). Renders a tiny chawan-
		 *  glyph overlay top-right of each owned dot. Hero/inline only. */
		ownedIds?: readonly string[];
		onSelect?: (entry: CatalogEntry) => void;
	} = $props();

	// ─── Size configuration ──────────────────────────────────
	interface ChartConfig {
		outer: number;
		pad: number;
		chart: number;
		dot: number;
		labels: boolean;
		grid: boolean;
		labelSize: number;
		nameSize: number;
		brandSize: number;
	}

	const config: ChartConfig = $derived.by(() => {
		if (size === 'hero') {
			return {
				outer: 320,
				pad: 30,
				chart: 260,
				dot: 9,
				labels: true,
				grid: true,
				labelSize: 9,
				nameSize: 13,
				brandSize: 9
			};
		}
		if (size === 'inline') {
			return {
				outer: 248,
				pad: 24,
				chart: 200,
				dot: 8,
				labels: true,
				grid: false,
				labelSize: 8,
				nameSize: 12,
				brandSize: 8
			};
		}
		return {
			outer: 72,
			pad: 5,
			chart: 62,
			dot: 5,
			labels: false,
			grid: false,
			labelSize: 0,
			nameSize: 0,
			brandSize: 0
		};
	});

	// Only entries with a published taste profile go on the chart.
	const plotted = $derived(products.filter(hasTaste));

	// ─── Coordinate projection (taste space → SVG pixels) ────
	function projectX(x: number): number {
		return config.pad + ((x + 1) / 2) * config.chart;
	}
	function projectY(y: number): number {
		// y flip — positive y is "full body", which renders at the top.
		return config.pad + ((1 - y) / 2) * config.chart;
	}

	// ─── Label placement (edge-aware flip) ───────────────────
	// Default: upper-right of dot. Near right edge → flip to upper-left.
	// Near top → flip below the dot. Both → lower-left.
	function labelOffsets(cx: number, cy: number) {
		const nearRight = cx > config.outer - 80;
		const nearTop = cy < config.pad + 16;
		if (nearRight && nearTop) return { dx: -8, dy: 18, anchor: 'end' as const };
		if (nearRight) return { dx: -8, dy: -4, anchor: 'end' as const };
		if (nearTop) return { dx: 8, dy: 18, anchor: 'start' as const };
		return { dx: 8, dy: -4, anchor: 'start' as const };
	}
</script>

<svg
	width={config.outer}
	height={config.outer}
	viewBox="0 0 {config.outer} {config.outer}"
	style="overflow: visible;"
	role="img"
	aria-label="Matcha flavor chart"
>
	<!-- Chart frame -->
	<rect
		x={config.pad}
		y={config.pad}
		width={config.chart}
		height={config.chart}
		fill="none"
		stroke="var(--color-hairline)"
		stroke-width="0.5"
	/>

	<!-- Half-grid (hero only): dashed lines at ±0.5 on both axes -->
	{#if config.grid}
		{@const half = 0.5}
		<line
			x1={config.pad}
			y1={projectY(half)}
			x2={config.pad + config.chart}
			y2={projectY(half)}
			stroke="var(--color-hairline)"
			stroke-width="0.5"
			stroke-dasharray="1.5 2.5"
			opacity="0.65"
		/>
		<line
			x1={config.pad}
			y1={projectY(-half)}
			x2={config.pad + config.chart}
			y2={projectY(-half)}
			stroke="var(--color-hairline)"
			stroke-width="0.5"
			stroke-dasharray="1.5 2.5"
			opacity="0.65"
		/>
		<line
			x1={projectX(half)}
			y1={config.pad}
			x2={projectX(half)}
			y2={config.pad + config.chart}
			stroke="var(--color-hairline)"
			stroke-width="0.5"
			stroke-dasharray="1.5 2.5"
			opacity="0.65"
		/>
		<line
			x1={projectX(-half)}
			y1={config.pad}
			x2={projectX(-half)}
			y2={config.pad + config.chart}
			stroke="var(--color-hairline)"
			stroke-width="0.5"
			stroke-dasharray="1.5 2.5"
			opacity="0.65"
		/>
	{/if}

	<!-- Center cross — slightly stronger than the half-grid -->
	<line
		x1={config.pad}
		y1={projectY(0)}
		x2={config.pad + config.chart}
		y2={projectY(0)}
		stroke="var(--color-hairline)"
		stroke-width="0.5"
		opacity="0.9"
	/>
	<line
		x1={projectX(0)}
		y1={config.pad}
		x2={projectX(0)}
		y2={config.pad + config.chart}
		stroke="var(--color-hairline)"
		stroke-width="0.5"
		opacity="0.9"
	/>

	<!-- Axis labels (hidden on thumb) -->
	{#if config.labels}
		<text
			x={config.outer / 2}
			y={config.pad - 8}
			font-family="var(--font-mono)"
			font-size={config.labelSize}
			fill="var(--color-muted)"
			text-anchor="middle"
			style="letter-spacing: 0.14em;"
		>
			FULL-BODY
		</text>
		<text
			x={config.outer / 2}
			y={config.pad + config.chart + 8 + config.labelSize}
			font-family="var(--font-mono)"
			font-size={config.labelSize}
			fill="var(--color-muted)"
			text-anchor="middle"
			style="letter-spacing: 0.14em;"
		>
			REFRESHING
		</text>
		<text
			x={config.pad - 8}
			y={config.outer / 2}
			font-family="var(--font-mono)"
			font-size={config.labelSize}
			fill="var(--color-muted)"
			text-anchor="end"
			dominant-baseline="middle"
			style="letter-spacing: 0.14em;"
		>
			SHARP
		</text>
		<text
			x={config.pad + config.chart + 8}
			y={config.outer / 2}
			font-family="var(--font-mono)"
			font-size={config.labelSize}
			fill="var(--color-muted)"
			text-anchor="start"
			dominant-baseline="middle"
			style="letter-spacing: 0.14em;"
		>
			MILD
		</text>
	{/if}

	<!-- Plotted dots -->
	{#each plotted as p (p.id)}
		{@const cx = projectX(p.taste.x)}
		{@const cy = projectY(p.taste.y)}
		{@const brand = BRANDS[p.brand]}
		{@const dimmed = brandFilter !== undefined && p.brand !== brandFilter}
		{@const highlighted = highlightId === p.id}
		{@const r = highlighted ? config.dot / 2 + 1 : config.dot / 2}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<g
			role={onSelect ? 'button' : undefined}
			aria-label={onSelect ? `${p.name}, ${brand.shortName}` : undefined}
			onclick={() => onSelect?.(p)}
			style="cursor: {onSelect
				? 'pointer'
				: 'default'}; opacity: {dimmed ? 0.18 : 1}; transition: opacity 0.2s;"
		>
			<title>{p.name} · {brand.shortName}</title>

			{#if brand.glyph === 'disc'}
				<circle {cx} {cy} r={r * 0.85} fill="var(--color-data)" />
			{:else if brand.glyph === 'ring'}
				<circle
					{cx}
					{cy}
					r={r * 0.78}
					fill="none"
					stroke="var(--color-data)"
					stroke-width="1.1"
				/>
			{:else if brand.glyph === 'diamond'}
				<polygon
					points={`${cx},${cy - r * 0.95} ${cx + r * 0.95},${cy} ${cx},${cy + r * 0.95} ${cx - r * 0.95},${cy}`}
					fill="var(--color-data)"
				/>
			{:else if brand.glyph === 'triangle'}
				<polygon
					points={`${cx},${cy - r * 0.95} ${cx + r * 0.95 * 0.866},${cy + r * 0.95 * 0.5} ${cx - r * 0.95 * 0.866},${cy + r * 0.95 * 0.5}`}
					fill="var(--color-data)"
				/>
			{:else if brand.glyph === 'square-open'}
				<rect
					x={cx - r * 0.78}
					y={cy - r * 0.78}
					width={r * 0.78 * 2}
					height={r * 0.78 * 2}
					fill="none"
					stroke="var(--color-data)"
					stroke-width="1.1"
				/>
			{/if}

			<!-- Highlight halo — tea green in BOTH themes (selection affordance) -->
			{#if highlighted}
				<circle
					{cx}
					{cy}
					r={r + 2.5}
					fill="none"
					stroke="var(--color-tea)"
					stroke-width="1"
				/>
			{/if}

			<!-- "I've tried" overlay: tiny chawan-glyph at top-right of dot.
			     Skipped on thumb size (too small to read). -->
			{#if size !== 'thumb' && ownedIds.includes(p.id)}
				<g transform="translate({cx + r + 3} {cy - r - 3})" opacity={dimmed ? 0.4 : 1}>
					<title>You have a tin of this</title>
					<circle r="2.8" fill="none" stroke="var(--color-data)" stroke-width="0.5" opacity="0.55" />
					<circle r="2" fill="none" stroke="var(--color-data)" stroke-width="0.5" opacity="0.55" />
					<circle r="1" fill="var(--color-data)" />
				</g>
			{/if}
		</g>
	{/each}

	<!-- Inline name label for `labelFor` product (drawn after dots so it sits on top) -->
	{#if labelFor && config.labels}
		{@const labelEntry = plotted.find((p) => p.id === labelFor)}
		{#if labelEntry}
			{@const cx = projectX(labelEntry.taste.x)}
			{@const cy = projectY(labelEntry.taste.y)}
			{@const brand = BRANDS[labelEntry.brand]}
			{@const off = labelOffsets(cx, cy)}
			<text
				x={cx + off.dx}
				y={cy + off.dy}
				font-family="var(--font-display)"
				font-style="italic"
				font-size={config.nameSize}
				fill="var(--color-ink)"
				text-anchor={off.anchor}
			>
				{labelEntry.name}
			</text>
			<text
				x={cx + off.dx}
				y={cy + off.dy + config.nameSize + 1}
				font-family="var(--font-mono)"
				font-size={config.brandSize}
				fill="var(--color-muted)"
				text-anchor={off.anchor}
				style="letter-spacing: 0.14em;"
			>
				{brand.shortName.toUpperCase()}
			</text>
		{/if}
	{/if}
</svg>

<style>
	@media (prefers-reduced-motion: reduce) {
		svg g {
			transition: none !important;
		}
	}
</style>
