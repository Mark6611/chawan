<script lang="ts">
	// Home / Today.
	// States: loading · empty · normal · normal+again.
	// Reads sessions and tins from the repository. Derives the "tin in use"
	// (the most recent personal session's tin, if not archived) and the
	// "Again?" suggestion (via detectUsual). Phase-0 decision: the fork
	// screen stays, so the primary CTA goes to /sessions/new (the fork) —
	// not directly to /sessions/new/personal.

	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import { isPersonal, newId, nowIso, type Session, type Tin } from '$lib/db/types';
	import { bowlsThisWeek, formatTimeAgo } from '$lib/sessions/compute';
	import { detectUsual } from '$lib/sessions/again';
	import { tinFreshness, tinRemaining } from '$lib/tins/compute';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import ConsumptionRail from '$lib/components/ConsumptionRail.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	let sessions = $state<Session[]>([]);
	let tins = $state<Tin[]>([]);
	let loaded = $state(false);

	async function load() {
		sessions = await repository.listSessions();
		tins = await repository.listTins();
		loaded = true;
	}

	onMount(load);

	const lastSession = $derived(sessions[0]);
	const lastPersonal = $derived(sessions.find(isPersonal));
	const activeTin = $derived.by(() => {
		if (!lastPersonal) return undefined;
		return tins.find((t) => t.id === lastPersonal.tinId && !t.archived);
	});
	const personalForTin = $derived.by(() =>
		activeTin ? sessions.filter(isPersonal).filter((s) => s.tinId === activeTin.id) : []
	);
	const tinRem = $derived(activeTin ? tinRemaining(activeTin, personalForTin) : 0);
	const tinFresh = $derived(activeTin ? tinFreshness(activeTin, personalForTin) : null);
	const weekBowls = $derived(bowlsThisWeek(sessions));
	const usual = $derived(detectUsual(sessions));

	const today = new Date().toLocaleDateString('en-US', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});

	// One-tap repeat: clone the suggested session with fresh id + timestamps.
	// Rating and notes don't carry over — they're per-session impressions.
	async function logAgain() {
		if (!usual) return;
		const now = nowIso();
		const repeat = {
			...usual.session,
			id: newId(),
			brewedAt: now,
			createdAt: now,
			updatedAt: now,
			rating: undefined,
			notes: undefined
		};
		await repository.saveSession(repeat);
		await load();
	}
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<Eyebrow>{today}</Eyebrow>
	<div class="mt-2">
		<Display size="l">Today</Display>
	</div>

	{#if !loaded}
		<div class="mt-16 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if sessions.length === 0}
		<!-- Empty state -->
		<Hairline class="my-7" />
		<div class="flex flex-col items-center text-center">
			<Chawan size={72} filled={false} />
			<div class="mt-6">
				<Display size="m">Your first bowl.</Display>
			</div>
			<p class="text-muted mt-4 max-w-[24ch] text-[14px] italic">
				Tap below to log your first matcha session.
			</p>
			<div class="mt-8 w-full">
				<PrimaryButton href="/sessions/new">Begin a session</PrimaryButton>
			</div>
		</div>
	{:else}
		<Hairline class="my-7" />

		<!-- Last session -->
		<section>
			<Eyebrow>Last · {formatTimeAgo(lastSession.brewedAt)}</Eyebrow>
			<div class="mt-2">
				{#if isPersonal(lastSession)}
					{@const tinName = tins.find((t) => t.id === lastSession.tinId)?.name ?? 'tin'}
					<Display size="m" italic={false} as="h2">{tinName}</Display>
					<div class="mt-1">
						<Mono size="meta" tone="muted">
							{lastSession.style} · {lastSession.powderGrams}g · {lastSession.waterGrams}g · {lastSession.waterTempC}°C
						</Mono>
					</div>
				{:else}
					<Display size="m" italic={false} as="h2">{lastSession.cafeName}</Display>
					<div class="mt-1">
						<Mono size="meta" tone="muted">
							cafe · {lastSession.style}{lastSession.maker ? ' · ' + lastSession.maker : ''}
						</Mono>
					</div>
				{/if}
			</div>
		</section>

		<Hairline class="my-7" />

		<!-- Bowls this week -->
		<section>
			<Eyebrow>Bowls this week</Eyebrow>
			<div class="mt-2 flex items-baseline gap-2">
				<Mono size="xl" weight="light" tone="data">{weekBowls}</Mono>
				<Mono size="meta" tone="muted">{weekBowls === 1 ? 'bowl' : 'bowls'}</Mono>
			</div>
		</section>

		<!-- Tin in use (only if there's an active tin from a recent personal session) -->
		{#if activeTin}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Tin in use</Eyebrow>
				<div class="mt-2">
					<Display size="s" italic={false} as="h3">{activeTin.name}</Display>
					<div class="mt-1">
						<Mono size="meta" tone="muted">{activeTin.maker}</Mono>
					</div>
				</div>
				<div class="mt-4">
					<ConsumptionRail percent={1 - tinRem / activeTin.weightGrams} />
				</div>
				<div class="mt-2 flex justify-between">
					<Mono size="meta" tone="muted">
						{tinRem.toFixed(0)}g / {activeTin.weightGrams}g
					</Mono>
					{#if tinFresh?.bowlsLeft != null}
						<Mono size="meta" tone="muted">~{tinFresh.bowlsLeft} bowls left</Mono>
					{/if}
				</div>
			</section>
		{/if}

		<Hairline class="my-7" />

		<!-- "Again?" — one-tap repeat of the last matching personal session -->
		{#if usual}
			<button
				type="button"
				onclick={logAgain}
				class="border-tea bg-tea-wash mb-3 flex w-full items-center justify-between rounded-full
					border-[0.5px] px-5 py-3 text-left transition-opacity duration-150 hover:opacity-90"
			>
				<span class="flex flex-col gap-0.5">
					<span class="text-tea font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase">
						Again? · {Math.max(1, Math.floor(usual.hoursAgo))}h ago
					</span>
					<span class="text-ink font-mono text-[12px]">
						{usual.session.style} · {usual.session.powderGrams}g · {usual.session.waterTempC}°C
					</span>
				</span>
				<span class="text-tea font-mono text-[14px]">→</span>
			</button>
		{/if}

		<PrimaryButton href="/sessions/new">Begin a session</PrimaryButton>
	{/if}
</main>
