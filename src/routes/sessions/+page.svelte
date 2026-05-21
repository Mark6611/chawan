<script lang="ts">
	// Sessions list — chronological feed, grouped by day, with a filter rail.
	// Sticky day headers pin while scrolling so you always know which date
	// you're inside.

	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import { type Session, type Tin } from '$lib/db/types';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import SessionRow from '$lib/components/SessionRow.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	type Filter = 'all' | 'personal' | 'cafe';

	let sessions = $state<Session[]>([]);
	let tins = $state<Tin[]>([]);
	let loaded = $state(false);
	let filter = $state<Filter>('all');

	async function load() {
		const [s, t] = await Promise.all([repository.listSessions(), repository.listTins()]);
		sessions = s;
		tins = t;
		loaded = true;
	}
	onMount(load);

	const tinsById = $derived.by(() => {
		const m: Record<string, Tin> = {};
		for (const t of tins) m[t.id] = t;
		return m;
	});

	const counts = $derived({
		all: sessions.length,
		personal: sessions.filter((s) => s.kind === 'personal').length,
		cafe: sessions.filter((s) => s.kind === 'cafe').length
	});

	const filtered = $derived(
		filter === 'all' ? sessions : sessions.filter((s) => s.kind === filter)
	);

	// Group by YYYY-MM-DD; insertion order is desc-by-brewedAt because the
	// repository returns sessions sorted that way.
	const groups = $derived.by(() => {
		const byDay = new Map<string, Session[]>();
		for (const s of filtered) {
			const day = s.brewedAt.slice(0, 10);
			if (!byDay.has(day)) byDay.set(day, []);
			byDay.get(day)!.push(s);
		}
		return Array.from(byDay.entries());
	});

	function formatDayHeader(yyyyMmDd: string): string {
		const [y, m, d] = yyyyMmDd.split('-').map(Number);
		const dDate = new Date(y, m - 1, d);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (dDate.getTime() === today.getTime()) return 'TODAY';
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		if (dDate.getTime() === yesterday.getTime()) return 'YESTERDAY';
		return dDate
			.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
			.toUpperCase();
	}

	const filters: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'personal', label: 'Personal' },
		{ value: 'cafe', label: 'Cafe' }
	];
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<Eyebrow>Inventory</Eyebrow>
	<div class="mt-2">
		<Display size="l">Sessions</Display>
	</div>

	{#if !loaded}
		<div class="mt-16 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if sessions.length === 0}
		<Hairline class="my-7" />
		<div class="flex flex-col items-center text-center">
			<Chawan size={72} filled={false} />
			<div class="mt-6">
				<Display size="m">No sessions yet.</Display>
			</div>
			<p class="text-muted mt-4 max-w-[26ch] text-[14px] italic">
				Log your first bowl from Home.
			</p>
			<div class="mt-8 w-full">
				<PrimaryButton href="/sessions/new">Begin a session</PrimaryButton>
			</div>
		</div>
	{:else}
		<!-- Filter rail -->
		<nav
			class="border-hairline -mx-6 mt-7 flex gap-5 border-b px-6 pb-3"
			aria-label="Filter sessions"
		>
			{#each filters as f (f.value)}
				<button
					type="button"
					onclick={() => (filter = f.value)}
					class="font-mono text-[11px] tracking-[0.10em] uppercase {filter === f.value
						? 'text-tea'
						: 'text-muted hover:text-ink'}"
				>
					{f.label} <span class="text-faint">· {counts[f.value]}</span>
				</button>
			{/each}
		</nav>

		{#if filtered.length === 0}
			<div class="mt-12 text-center">
				<Mono size="meta" tone="muted">No {filter} sessions yet.</Mono>
			</div>
		{:else}
			{#each groups as [day, daySessions] (day)}
				<section class="mt-2">
					<div class="bg-paper border-hairline -mx-6 sticky top-0 z-10 border-b px-6 py-3">
						<Eyebrow>{formatDayHeader(day)}</Eyebrow>
					</div>
					{#each daySessions as s (s.id)}
						<SessionRow session={s} {tinsById} />
					{/each}
				</section>
			{/each}
		{/if}
	{/if}
</main>
