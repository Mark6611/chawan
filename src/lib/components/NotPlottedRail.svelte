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
	<div class="mt-6 border-t border-hairline pt-4">
		<div class="mb-3 font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">
			Not plotted · {products.length}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each products as p (p.id)}
				{@const brand = BRANDS[p.brand]}
				<a
					href="/catalog/{p.id}"
					class="inline-flex items-center gap-2 rounded-full border-[0.5px] border-hairline px-3 py-1.5 transition-colors hover:bg-surface"
					aria-label="Open {p.name}"
				>
					<BrandGlyph brand={p.brand} size={10} />
					<span class="font-display text-[13px] text-ink italic">{p.name}</span>
					<span class="font-mono text-[10px] text-muted">{brand.shortName}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}
