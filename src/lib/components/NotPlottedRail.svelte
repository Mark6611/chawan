<script lang="ts">
	// Hairline-bordered chip strip for catalog entries that don't have a
	// published taste profile. Each chip is tappable → catalog detail.
	// Only renders when there's at least one unplotted product.

	import type { CatalogEntry } from '$lib/catalog/types';
	import { BRANDS } from '$lib/catalog/brands';
	import BrandGlyph from './BrandGlyph.svelte';

	let { products }: { products: readonly CatalogEntry[] } = $props();
</script>

{#if products.length > 0}
	<div class="border-hairline mt-6 border-t pt-4">
		<div
			class="text-muted mb-3 font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
		>
			Not plotted · {products.length}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each products as p (p.id)}
				{@const brand = BRANDS[p.brand]}
				<a
					href="/catalog/{p.id}"
					class="border-hairline hover:bg-surface inline-flex items-center gap-2 rounded-full border-[0.5px] px-3 py-1.5 transition-colors"
					aria-label="Open {p.name}"
				>
					<BrandGlyph brand={p.brand} size={10} />
					<span class="text-ink font-display text-[13px] italic">{p.name}</span>
					<span class="text-muted font-mono text-[10px]">{brand.shortName}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}
