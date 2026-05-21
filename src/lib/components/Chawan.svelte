<script lang="ts">
	// The chawan glyph — three concentric circles (a bowl seen from above).
	// Reference radii at size=24: outer 11, middle 8, inner 4.5 (per design system).
	// Filled: inner ring is solid --color-data at 0.85 alpha.
	// Ring: inner ring is stroked, not filled.
	// Globally hidden when preferences.hideChawan is true (toggle in /settings).

	import { preferences } from '$lib/preferences.svelte';

	let {
		size = 48,
		filled = true,
		title
	}: {
		size?: number;
		filled?: boolean;
		title?: string;
	} = $props();

	// Scale the reference radii (which assume size=24) to the requested size.
	const k = $derived(size / 24);
	const r1 = $derived(11 * k);
	const r2 = $derived(8 * k);
	const r3 = $derived(4.5 * k);
	const sw = $derived(Math.max(0.6, 0.8 * k));
	const c = $derived(size / 2);
</script>

{#if !preferences.hideChawan}
	<svg
		class="chawan-glyph"
		width={size}
		height={size}
		viewBox="0 0 {size} {size}"
		role={title ? 'img' : 'presentation'}
		aria-hidden={!title}
	>
		{#if title}<title>{title}</title>{/if}
		<circle cx={c} cy={c} r={r1} fill="none" stroke="var(--color-hairline)" stroke-width={sw} />
		<circle cx={c} cy={c} r={r2} fill="none" stroke="var(--color-hairline)" stroke-width={sw} />
		{#if filled}
			<circle cx={c} cy={c} r={r3} fill="var(--color-data)" opacity="0.85" />
		{:else}
			<circle cx={c} cy={c} r={r3} fill="none" stroke="var(--color-data)" stroke-width={sw} />
		{/if}
	</svg>
{/if}
