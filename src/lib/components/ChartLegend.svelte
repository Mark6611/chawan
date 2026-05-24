<script lang="ts">
	// Brand-glyph key for the FlavorChart. Sits below the chart on hero
	// views. Each row: glyph + shortName + count. When `active` is set,
	// non-active brands fade to 35% opacity (mirrors the chart's dim
	// behaviour when brandFilter is set).

	import { listBrands } from '$lib/catalog/brands';
	import type { BrandId } from '$lib/catalog/types';
	import BrandGlyph from './BrandGlyph.svelte';

	let {
		active,
		counts = {},
		onSelect
	}: {
		active?: BrandId;
		counts?: Partial<Record<BrandId, number>>;
		/** Tap a legend entry to filter the chart to that brand.
		 *  Tapping the active brand again clears the filter. */
		onSelect?: (brand: BrandId | undefined) => void;
	} = $props();

	const brands = listBrands();

	function tap(id: BrandId) {
		if (!onSelect) return;
		onSelect(active === id ? undefined : id);
	}
</script>

<div class="flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label="Brand legend">
	{#each brands as brand (brand.id)}
		{@const dimmed = active !== undefined && active !== brand.id}
		{@const count = counts[brand.id]}
		{#if onSelect}
			<button
				type="button"
				onclick={() => tap(brand.id)}
				class="flex items-center gap-2 transition-opacity"
				style="opacity: {dimmed ? 0.35 : 1};"
				aria-pressed={active === brand.id}
			>
				<BrandGlyph brand={brand.id} size={11} />
				<span class="text-ink font-mono text-[11px]">{brand.shortName}</span>
				{#if count != null}
					<span class="text-muted font-mono text-[10px]">· {count}</span>
				{/if}
			</button>
		{:else}
			<div class="flex items-center gap-2" style="opacity: {dimmed ? 0.35 : 1};">
				<BrandGlyph brand={brand.id} size={11} />
				<span class="text-ink font-mono text-[11px]">{brand.shortName}</span>
				{#if count != null}
					<span class="text-muted font-mono text-[10px]">· {count}</span>
				{/if}
			</div>
		{/if}
	{/each}
</div>
