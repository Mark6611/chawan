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
				<span class="truncate font-display text-[18px] text-ink italic">{entry.name}</span>
				{#if entry.kanji}
					<span class="shrink-0 font-display text-[14px] text-muted">{entry.kanji}</span>
				{/if}
			</div>
			<div class="mt-0.5 font-mono text-[11px] tracking-[0.05em] text-muted">
				{brand.shortName} · {GRADE_LABELS[entry.grade]} · {REGION_LABELS[entry.region]}
			</div>
		</div>
		{#if tried}
			<Chawan size={14} filled />
		{/if}
		{#if !picker}
			<span class="shrink-0 font-mono text-[14px] text-faint" aria-hidden="true">›</span>
		{/if}
	</div>
{/snippet}

{#if picker}
	<button
		type="button"
		onclick={() => onpick?.(entry)}
		class="-mx-6 block w-full border-b border-hairline px-6 py-3 text-left transition-colors hover:bg-surface"
		aria-label="Pick {entry.name}"
	>
		{@render body()}
	</button>
{:else}
	<a
		href="/catalog/{entry.id}"
		class="-mx-6 block border-b border-hairline px-6 py-3 transition-colors hover:bg-surface"
		aria-label="Open {entry.name}"
	>
		{@render body()}
	</a>
{/if}
