<script lang="ts">
	// Home / Today.
	// States: loading · empty · normal · normal+again.
	// Reads sessions and tins from the repository. Derives the "tin in use"
	// (the most recent personal session's tin, if not archived) and the
	// "Again?" suggestion (via detectUsual). Phase-0 decision: the fork
	// screen stays, so the primary CTA goes to /sessions/new (the fork) —
	// not directly to /sessions/new/personal.

	import { repository } from '$lib/db/repository';
	import { STYLE_LABELS, isPersonal, newId, nowIso, type Session, type Tin } from '$lib/db/types';
	import { bowlsThisWeek, formatTimeAgo, styleLabel } from '$lib/sessions/compute';
	import { detectUsual } from '$lib/sessions/again';
	import { tinFreshness, tinRemaining } from '$lib/tins/compute';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import SessionRow from '$lib/components/SessionRow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import ConsumptionRail from '$lib/components/ConsumptionRail.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';
	import LoadError from '$lib/components/LoadError.svelte';

	let sessions = $state<Session[]>([]);
	let tins = $state<Tin[]>([]);
	let loaded = $state(false);
	let loadError = $state<string | null>(null);

	async function load() {
		try {
			loadError = null;
			sessions = await repository.listSessions();
			tins = await repository.listTins();
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Could not load your sessions.';
		} finally {
			loaded = true;
		}
	}

	// Initial load.
	$effect(() => {
		load();
	});

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

	const today = new Date().toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});

	// One-tap repeat: clone the suggested session with fresh id + timestamps.
	// Rating and notes don't carry over — they're per-session impressions.
	let logging = $state(false);
	let logError = $state<string | null>(null);
	async function logAgain() {
		// Guard the in-flight window: this writes a NEW session, so a double tap
		// on a slow device logged the bowl twice with no way to tell.
		if (!usual || logging) return;
		logging = true;
		logError = null;
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
		try {
			await repository.saveSession(repeat);
			await load();
		} catch (e) {
			logError = e instanceof Error ? e.message : 'Could not log that session.';
		} finally {
			logging = false;
		}
	}

	// For the recent-sessions pane (unfolded iPhone Duo).
	const tinsById = $derived(Object.fromEntries(tins.map((t) => [t.id, t])));
</script>

<div class="split">
	<main class="split-main mx-auto max-w-md px-6 pt-page pb-28">
		<Eyebrow>{today}</Eyebrow>
		<div class="mt-2">
			<Display size="l">Today</Display>
		</div>

		{#if loadError}
			<LoadError
				onretry={load}
				message="Couldn't load your sessions — local storage may be blocked."
			/>
		{:else if !loaded}
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
				<p class="mt-4 max-w-[24ch] text-[14px] text-muted italic">
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
								{STYLE_LABELS[lastSession.style]} · {lastSession.powderGrams}g · {lastSession.waterGrams}g
								· {lastSession.waterTempC}°C
							</Mono>
						</div>
					{:else}
						<Display size="m" italic={false} as="h2">{lastSession.cafeName}</Display>
						<div class="mt-1">
							<Mono size="meta" tone="muted">
								cafe · {styleLabel(lastSession)}{lastSession.maker ? ' · ' + lastSession.maker : ''}
							</Mono>
						</div>
					{/if}
				</div>
			</section>

			<Hairline class="my-7" />

			<!-- Bowls this week -->
			<section>
				<div class="flex items-baseline justify-between">
					<Eyebrow>Bowls this week</Eyebrow>
					<a
						href="/insights"
						class="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase hover:text-ink"
					>
						insights →
					</a>
				</div>
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
					disabled={logging}
					class="mb-3 flex w-full items-center justify-between rounded-full border-[0.5px] border-tea
					bg-tea-wash px-5 py-3 text-left transition-opacity duration-150 hover:opacity-90
					disabled:opacity-60"
				>
					<span class="flex flex-col gap-0.5">
						<span class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-tea uppercase">
							Again? · {usual.hoursAgo < 1 ? 'just now' : `${Math.floor(usual.hoursAgo)}h ago`}
						</span>
						<span class="font-mono text-[12px] text-ink">
							{STYLE_LABELS[usual.session.style]} · {usual.session.powderGrams}g · {usual.session
								.waterTempC}°C
						</span>
					</span>
					<span class="font-mono text-[14px] text-tea">{logging ? '…' : '→'}</span>
				</button>
				{#if logError}
					<p class="mb-3 px-1 font-mono text-[11px] text-danger">{logError}</p>
				{/if}
			{/if}

			<PrimaryButton href="/sessions/new">Begin a session</PrimaryButton>
		{/if}
	</main>
	<!-- Unfolded iPhone Duo: the half you read. Today's actions stay on the right,
     under the thumb; the recent log sits beside them instead of a tab away. -->
	<aside class="split-aside" aria-label="Recent sessions">
		<Eyebrow>Recent</Eyebrow>
		<div class="mt-2">
			<Display size="m" as="h2">Your last bowls</Display>
		</div>
		{#if sessions.length === 0}
			<p class="mt-4 max-w-[30ch] text-[14px] text-muted italic">
				Your bowls will collect here as you log them.
			</p>
		{:else}
			<div class="mt-5 border-t border-hairline">
				{#each sessions.slice(0, 7) as s (s.id)}
					<SessionRow session={s} {tinsById} />
				{/each}
			</div>
			<div class="mt-5">
				<a
					href="/sessions"
					class="font-mono text-[11px] tracking-[0.10em] text-muted uppercase hover:text-ink"
				>
					all sessions →
				</a>
			</div>
		{/if}
	</aside>
</div>
