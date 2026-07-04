<script lang="ts">
	// Typeahead picker for tins — used in the personal session form so the
	// user can search existing tins OR jump to /tins/new with the typed name
	// pre-filled and a returnTo pointing back here. Mirrors the coffee app's
	// BagPicker pattern but simplified for mobile (no keyboard navigation;
	// tap to select), uses chawan atoms instead of coffee's copper styling.
	//
	// Two visual states:
	//   - selected: a chip-like row showing the chosen tin's name + maker +
	//     remaining grams, with a "change" action that clears the selection
	//     and opens the search input
	//   - searching: input field; tap focuses → dropdown opens; typing
	//     filters by name OR maker; bottom-of-dropdown row is "Create new"
	//
	// Parent wires:
	//   <TinPicker bind:tinId tins personalSessions oncreatenew={fn} />

	import type { PersonalSession, Tin } from '$lib/db/types';
	import { tinRemaining } from '$lib/tins/compute';
	import Chawan from './Chawan.svelte';

	let {
		tinId = $bindable<string | undefined>(undefined),
		tins,
		personalSessions = [],
		excludeSessionId,
		oncreatenew,
		onbrowsecatalog
	}: {
		tinId?: string;
		tins: Tin[];
		personalSessions?: PersonalSession[];
		/** When editing a session, exclude its own powderGrams from
		 *  remaining-math so the picker shows the post-save remaining. */
		excludeSessionId?: string;
		oncreatenew?: (queryName: string) => void;
		/** Optional — when provided, surfaces a "Browse catalog" footer
		 *  action alongside "Create new tin". Parent typically saves the
		 *  session draft + navigates to /catalog?return=... */
		onbrowsecatalog?: () => void;
	} = $props();

	let query = $state('');
	let isOpen = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	// Selected tin may be archived (edit mode); the dropdown only ever
	// surfaces active tins.
	const selectedTin = $derived(tins.find((t) => t.id === tinId));
	const activeTins = $derived(tins.filter((t) => !t.archived));

	function sessionsFor(t: Tin) {
		return personalSessions
			.filter((s) => s.tinId === t.id)
			.filter((s) => !excludeSessionId || s.id !== excludeSessionId);
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return activeTins.slice(0, 5);
		return activeTins.filter(
			(t) => t.name.toLowerCase().includes(q) || (t.maker?.toLowerCase().includes(q) ?? false)
		);
	});

	const hasQuery = $derived(query.length > 0);

	function selectTin(t: Tin) {
		tinId = t.id;
		query = '';
		isOpen = false;
		inputEl?.blur();
	}

	function clearSelection() {
		tinId = undefined;
		query = '';
		// give the DOM a moment, then focus the now-rendered input
		setTimeout(() => inputEl?.focus(), 0);
	}

	function createNew() {
		oncreatenew?.(query.trim());
	}

	function browseCatalog() {
		onbrowsecatalog?.();
	}

	const selectedRem = $derived(
		selectedTin ? tinRemaining(selectedTin, sessionsFor(selectedTin)) : 0
	);
</script>

{#if selectedTin}
	<!-- Selected state -->
	<button
		type="button"
		onclick={clearSelection}
		class="-mx-1 flex w-full items-baseline justify-between gap-3 rounded-[14px] border-[0.5px] border-rule px-3 py-3 text-left transition-colors hover:bg-surface"
		aria-label="Change tin"
	>
		<span class="min-w-0 flex-1">
			<span class="block font-display text-[20px] text-ink italic">{selectedTin.name}</span>
			<span class="mt-0.5 block font-mono text-[11px] text-muted">
				{selectedTin.maker} · {selectedRem.toFixed(0)}g left{selectedTin.archived
					? ' · archived'
					: ''}
			</span>
		</span>
		<span
			class="shrink-0 font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase"
		>
			change
		</span>
	</button>
{:else}
	<div class="relative">
		<!-- Input -->
		<div
			class="flex items-center gap-2 rounded-[14px] border-[0.5px] border-hairline px-3 py-2.5 transition-colors focus-within:border-tea"
		>
			<input
				bind:this={inputEl}
				bind:value={query}
				onfocus={() => (isOpen = true)}
				onblur={() => setTimeout(() => (isOpen = false), 200)}
				placeholder={activeTins.length === 0 ? 'No tins yet — add one' : 'Search or add a tin…'}
				class="w-full bg-transparent font-body text-[15px] text-ink outline-none placeholder:text-faint"
			/>
			{#if hasQuery}
				<span class="shrink-0 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
					{filtered.length} match{filtered.length === 1 ? '' : 'es'}
				</span>
			{/if}
		</div>

		{#if isOpen}
			<div
				class="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-[14px] border-[0.5px] border-hairline bg-paper shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
			>
				{#if filtered.length > 0}
					<div
						class="px-4 pt-3 pb-1 font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase"
					>
						{hasQuery ? 'Matches' : 'Recent'}
					</div>
					<div class="max-h-[40vh] overflow-y-auto">
						{#each filtered as t (t.id)}
							{@const remaining = tinRemaining(t, sessionsFor(t))}
							<button
								type="button"
								onmousedown={(e) => {
									e.preventDefault();
									selectTin(t);
								}}
								class="block w-full px-4 py-2.5 text-left transition-colors hover:bg-surface"
							>
								<div class="flex items-baseline justify-between gap-3">
									<span class="min-w-0 flex-1">
										<span class="block font-display text-[17px] text-ink italic">{t.name}</span>
										{#if t.maker}
											<span class="mt-0.5 block truncate font-mono text-[11px] text-muted"
												>{t.maker}</span
											>
										{/if}
									</span>
									<span class="shrink-0 font-mono text-[11px] text-muted tabular-nums">
										{remaining.toFixed(0)}g
									</span>
								</div>
							</button>
						{/each}
					</div>
				{:else if hasQuery}
					<div class="px-4 py-3">
						<span class="font-mono text-[11px] text-muted">No matching tins.</span>
					</div>
				{/if}

				<!-- "Create new" footer (always present) -->
				<button
					type="button"
					onmousedown={(e) => {
						e.preventDefault();
						createNew();
					}}
					class="block w-full border-t border-hairline px-4 py-3 text-left transition-colors hover:bg-surface"
				>
					<div class="flex items-center gap-3">
						<div
							class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tea text-on-tea"
							aria-hidden="true"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							>
								<path d="M6 2v8M2 6h8" />
							</svg>
						</div>
						<div class="min-w-0 flex-1">
							<div class="font-mono text-[11px] font-medium tracking-[0.10em] text-tea uppercase">
								{hasQuery ? 'Create new tin' : 'Add a new tin'}
							</div>
							{#if hasQuery}
								<div class="mt-0.5 truncate font-display text-[14px] text-ink italic">
									"{query}"
								</div>
							{:else}
								<div class="mt-0.5 font-mono text-[11px] text-muted">Open the tin form →</div>
							{/if}
						</div>
					</div>
				</button>

				<!-- "Browse catalog" footer (when wired) -->
				{#if onbrowsecatalog}
					<button
						type="button"
						onmousedown={(e) => {
							e.preventDefault();
							browseCatalog();
						}}
						class="block w-full border-t border-hairline px-4 py-3 text-left transition-colors hover:bg-surface"
					>
						<div class="flex items-center gap-3">
							<div
								class="grid h-7 w-7 shrink-0 place-items-center rounded-full border-[0.5px] border-rule"
								aria-hidden="true"
							>
								<Chawan size={16} />
							</div>
							<div class="min-w-0 flex-1">
								<div class="font-mono text-[11px] font-medium tracking-[0.10em] text-ink uppercase">
									Browse catalog
								</div>
								<div class="mt-0.5 font-mono text-[11px] text-muted">
									Pick from the curated lineup →
								</div>
							</div>
						</div>
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}
