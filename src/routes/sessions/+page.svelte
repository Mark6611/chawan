<script lang="ts">
	// Sessions list — chronological feed, grouped by day, with a filter rail.
	// Sticky day headers pin while scrolling so you always know which date
	// you're inside.

	import { repository } from '$lib/db/repository';
	import { syncState } from '$lib/sync.svelte';
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
	$effect(() => {
		void syncState.tick;
		load();
	});

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

	// Group by LOCAL calendar day; insertion order is desc-by-brewedAt because
	// the repository returns sessions sorted that way.
	//
	// UAT bug fix: this used to slice the ISO string (UTC date). In UTC+7 a
	// bowl logged at 01:12 local filed under "yesterday" — anything before
	// 07:00 grouped to the wrong day and never earned the TODAY header.
	// formatDayHeader below parses this key as local midnight, so the key
	// must be built from local date parts.
	const localDayKey = (iso: string): string => {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	};

	const groups = $derived.by(() => {
		const byDay = new Map<string, Session[]>();
		for (const s of filtered) {
			const day = localDayKey(s.brewedAt);
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
	<Eyebrow>Log</Eyebrow>
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
			<p class="mt-4 max-w-[26ch] text-[14px] text-muted italic">Log your first bowl from Home.</p>
			<div class="mt-8 w-full">
				<PrimaryButton href="/sessions/new">Begin a session</PrimaryButton>
			</div>
		</div>
	{:else}
		<!-- Filter rail -->
		<nav
			class="-mx-6 mt-7 flex gap-5 border-b border-hairline px-6 pb-3"
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
					<div class="sticky top-0 z-10 -mx-6 border-b border-hairline bg-paper px-6 py-3">
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
