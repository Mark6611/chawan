<script lang="ts">
	// Session detail — read view. Personal sessions get the 3-column brew
	// block (powder / water / temp) + ratio + whisk. Cafe sessions get price
	// (if logged) + milk (if latte). Both show rating + notes when present,
	// and an "edited Xm ago" footer if updatedAt is past createdAt by >1min.

	import { page } from '$app/state';
	import { repository } from '$lib/db/repository';
	import { syncState } from '$lib/sync.svelte';
	import {
		GRADE_LABELS,
		MILK_LABELS,
		REGION_LABELS,
		STYLE_LABELS,
		WHISK_LABELS,
		isPersonal,
		type Session,
		type Tin
	} from '$lib/db/types';
	import { formatRatio, formatTimeAgo } from '$lib/sessions/compute';
	import { formatPrice } from '$lib/sessions/currency';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Rating from '$lib/components/Rating.svelte';

	let session = $state<Session | null | undefined>(undefined);
	let tin = $state<Tin | null>(null);

	const id = $derived(page.params.id);

	async function load() {
		if (!id) return;
		const s = await repository.getSession(id);
		session = s ?? null;
		if (s && isPersonal(s)) {
			tin = (await repository.getTin(s.tinId)) ?? null;
		}
	}
	// Re-fetch on mount, on route-param change, and after a sync pull.
	$effect(() => {
		void syncState.tick;
		if (id) load();
	});

	function dateLabel(iso: string): string {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		const date = d
			.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
			.toUpperCase();
		return `${date} · ${time}`;
	}

	function editedAgo(s: Session): string | null {
		const created = new Date(s.createdAt).getTime();
		const updated = new Date(s.updatedAt).getTime();
		if (updated - created < 60_000) return null;
		return formatTimeAgo(s.updatedAt);
	}
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/sessions"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	{#if session === undefined}
		<div class="mt-16 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if session === null}
		<div class="mt-16 text-center">
			<Display size="m">Session not found.</Display>
		</div>
	{:else}
		<div class="mt-8 flex items-baseline justify-between gap-3">
			<div class="min-w-0 flex-1">
				<Eyebrow>{STYLE_LABELS[session.style]} · {dateLabel(session.brewedAt)}</Eyebrow>
				<div class="mt-2">
					{#if isPersonal(session)}
						<Display size="xl">{tin?.name ?? '—'}</Display>
					{:else}
						<Display size="xl">{session.cafeName}</Display>
					{/if}
				</div>
			</div>
			<a
				href="/sessions/{session.id}/edit"
				class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
			>
				edit
			</a>
		</div>

		<!-- Meta line under the hero -->
		<div class="mt-3 flex flex-wrap gap-x-2">
			{#if isPersonal(session)}
				{#if tin}
					<Mono size="meta" tone="muted">{tin.maker}</Mono>
					<Mono size="meta" tone="muted">· {GRADE_LABELS[tin.grade]}</Mono>
					<Mono size="meta" tone="muted">· {REGION_LABELS[tin.region]}</Mono>
					{#if tin.cultivar}
						<Mono size="meta" tone="muted">· {tin.cultivar}</Mono>
					{/if}
				{/if}
			{:else}
				{#if session.maker}
					<Mono size="meta" tone="muted">{session.maker}</Mono>
					<Mono size="meta" tone="muted">· {REGION_LABELS[session.region]}</Mono>
				{:else}
					<Mono size="meta" tone="muted">{REGION_LABELS[session.region]}</Mono>
				{/if}
			{/if}
		</div>

		<Hairline class="my-7" />

		{#if isPersonal(session)}
			<!-- Brew block: 3-column big mono -->
			<section>
				<div class="grid grid-cols-3 gap-4">
					<div>
						<Eyebrow>Powder</Eyebrow>
						<div class="mt-2 flex items-baseline gap-1">
							<Mono size="xl" weight="light" tone="ink">{session.powderGrams}</Mono>
							<Mono size="meta" tone="muted">g</Mono>
						</div>
					</div>
					<div>
						<Eyebrow>Water</Eyebrow>
						<div class="mt-2 flex items-baseline gap-1">
							<Mono size="xl" weight="light" tone="ink">{session.waterGrams}</Mono>
							<Mono size="meta" tone="muted">g</Mono>
						</div>
					</div>
					<div>
						<Eyebrow>Temp</Eyebrow>
						<div class="mt-2 flex items-baseline gap-1">
							<Mono size="xl" weight="light" tone="ink">{session.waterTempC}</Mono>
							<Mono size="meta" tone="muted">°C</Mono>
						</div>
					</div>
				</div>
				<div class="mt-3">
					<Mono size="meta" tone="muted">Ratio · {formatRatio(session)}</Mono>
				</div>
			</section>

			{#if session.whisk}
				<Hairline class="my-7" />
				<section>
					<Eyebrow>Whisk</Eyebrow>
					<div class="mt-2">
						<Display size="s" italic={false} as="h3">{WHISK_LABELS[session.whisk]}</Display>
					</div>
				</section>
			{/if}

			{#if session.milk}
				<Hairline class="my-7" />
				<section>
					<Eyebrow>Milk</Eyebrow>
					<div class="mt-2">
						<Display size="s" italic={false} as="h3">{MILK_LABELS[session.milk]}</Display>
					</div>
				</section>
			{/if}
		{:else}
			<!-- Cafe-specific blocks -->
			{#if session.priceCents != null}
				<section>
					<Eyebrow>Price</Eyebrow>
					<div class="mt-2">
						<Mono size="xl" weight="light" tone="ink">
							{formatPrice(session.priceCents, session.priceCurrency ?? 'USD')}
						</Mono>
					</div>
				</section>
				<Hairline class="my-7" />
			{/if}

			{#if session.milk}
				<section>
					<Eyebrow>Milk</Eyebrow>
					<div class="mt-2">
						<Display size="s" italic={false} as="h3">{MILK_LABELS[session.milk]}</Display>
					</div>
				</section>
				<Hairline class="my-7" />
			{/if}
		{/if}

		{#if session.rating}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Rating</Eyebrow>
				<div class="mt-2">
					<Rating value={session.rating} size={12} />
				</div>
			</section>
		{/if}

		{#if session.notes}
			<Hairline class="my-7" />
			<section>
				<Eyebrow>Notes</Eyebrow>
				<p class="text-ink font-body mt-3 text-[16px] leading-relaxed italic">
					{session.notes}
				</p>
			</section>
		{/if}

		{@const ago = editedAgo(session)}
		{#if ago}
			<Hairline class="my-7" />
			<div class="text-center">
				<Mono size="meta" tone="faint">edited {ago}</Mono>
			</div>
		{/if}
	{/if}
</main>
