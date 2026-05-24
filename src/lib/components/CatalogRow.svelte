<script lang="ts">
	// Single row template for catalog browse + picker. `picker` swaps the
	// wrapper from <a href="/catalog/[id]"> to a <button> that fires
	// `onpick`. `tried` adds a small filled chawan glyph at the right
	// (rendered when the user has a Tin with matching catalogId).

	import type { CatalogEntry } from '$lib/catalog/types';
	import { BRANDS } from '$lib/catalog/brands';
	import { GRADE_LABELS, REGION_LABELS } from '$lib/db/types';

	import BrandGlyph from './BrandGlyph.svelte';
	import Chawan from './Chawan.svelte';

	let {
		entry,
		picker = false,
		tried = false,
		onpick
	}: {
		entry: CatalogEntry;
		picker?: boolean;
		tried?: boolean;
		onpick?: (entry: CatalogEntry) => void;
	} = $props();

	const brand = $derived(BRANDS[entry.brand]);
</script>

{#snippet body()}
	<div class="flex items-center gap-3">
		<BrandGlyph brand={entry.brand} size={14} title={brand.shortName} />
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline gap-2">
				<span class="text-ink font-display text-[18px] italic truncate">{entry.name}</span>
				{#if entry.kanji}
					<span class="text-muted font-display text-[14px] shrink-0">{entry.kanji}</span>
				{/if}
			</div>
			<div class="text-muted mt-0.5 font-mono text-[11px] tracking-[0.05em]">
				{brand.shortName} · {GRADE_LABELS[entry.grade]} · {REGION_LABELS[entry.region]}
			</div>
		</div>
		{#if tried}
			<Chawan size={14} filled />
		{/if}
		{#if !picker}
			<span class="text-faint shrink-0 font-mono text-[14px]" aria-hidden="true">›</span>
		{/if}
	</div>
{/snippet}

{#if picker}
	<button
		type="button"
		onclick={() => onpick?.(entry)}
		class="hover:bg-surface border-hairline -mx-6 block w-full border-b px-6 py-3 text-left transition-colors"
		aria-label="Pick {entry.name}"
	>
		{@render body()}
	</button>
{:else}
	<a
		href="/catalog/{entry.id}"
		class="hover:bg-surface border-hairline -mx-6 block border-b px-6 py-3 transition-colors"
		aria-label="Open {entry.name}"
	>
		{@render body()}
	</a>
{/if}
