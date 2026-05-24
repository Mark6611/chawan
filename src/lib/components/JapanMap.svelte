<script lang="ts">
	// Minimal hand-drawn outline of Japan with a pin at the given region.
	// Four polygon islands (Hokkaido / Honshu / Shikoku / Kyushu) stroked
	// in --color-hairline. Pin paints in --color-tea (consistent with
	// selection affordances elsewhere — green in both themes).
	//
	// Geographic accuracy is approximate; recognition is the goal. If you
	// want a precise atlas, embed real TopoJSON later — for now, the
	// chawan visual language asks for restraint, not cartography.

	import type { Region } from '$lib/db/types';
	import { REGION_LABELS } from '$lib/db/types';

	let {
		region,
		size = 180,
		showLabel = false,
		title
	}: {
		region?: Region;
		size?: number;
		showLabel?: boolean;
		title?: string;
	} = $props();

	// Pin coordinates in viewBox 0..200 × 0..200. Approximate, tuned to
	// land each pin inside the appropriate island polygon below.
	const REGION_PIN: Record<Region, { x: number; y: number } | null> = {
		uji: { x: 105, y: 100 }, // Kyoto Prefecture, central Honshu
		nishio: { x: 125, y: 95 }, // Aichi Prefecture, central Honshu
		shizuoka: { x: 140, y: 88 }, // Shizuoka Prefecture, central Honshu (east of Nishio)
		yame: { x: 32, y: 148 }, // Fukuoka Prefecture, northern Kyushu
		kagoshima: { x: 35, y: 175 }, // Kagoshima Prefecture, southern Kyushu
		other: null
	};

	const pin = $derived(region ? REGION_PIN[region] : null);
	const accessibleTitle = $derived(
		title ?? (region ? `Map of Japan · pin on ${REGION_LABELS[region]}` : 'Map of Japan')
	);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 200 200"
	role="img"
	aria-label={accessibleTitle}
>
	<title>{accessibleTitle}</title>

	<!-- Islands — simplified polygon approximation, hairline strokes -->
	<g
		stroke="var(--color-hairline)"
		stroke-width="0.6"
		fill="none"
		stroke-linejoin="round"
		stroke-linecap="round"
	>
		<!-- Hokkaido (top-right) -->
		<path d="M 140 20 L 175 18 L 188 38 L 178 65 L 150 72 L 135 50 Z" />
		<!-- Honshu (main island, arc-shaped, west-southwest to east-northeast) -->
		<path
			d="M 35 130 L 30 122 L 48 105 L 80 90 L 120 78 L 155 55 L 175 50 L 188 55 L 180 75 L 160 88 L 130 100 L 95 110 L 65 120 L 50 130 Z"
		/>
		<!-- Shikoku (small island south of central Honshu) -->
		<path d="M 70 135 L 95 135 L 100 145 L 80 152 L 67 145 Z" />
		<!-- Kyushu (south-west island) -->
		<path d="M 15 145 L 30 138 L 50 145 L 55 165 L 50 180 L 30 182 L 15 170 Z" />
	</g>

	{#if pin}
		<!-- Halo + filled pin -->
		<circle cx={pin.x} cy={pin.y} r="8" fill="var(--color-tea)" opacity="0.15" />
		<circle cx={pin.x} cy={pin.y} r="2.6" fill="var(--color-tea)" />

		{#if showLabel && region}
			<text
				x={pin.x}
				y={pin.y + 18}
				font-family="var(--font-mono)"
				font-size="9"
				fill="var(--color-muted)"
				text-anchor="middle"
				style="letter-spacing: 0.14em;"
			>
				{REGION_LABELS[region].toUpperCase()}
			</text>
		{/if}
	{/if}
</svg>
