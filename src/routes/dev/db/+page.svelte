<script lang="ts">
	// Temporary smoke-test surface for the Phase-1 repository.
	// Verifies that Dexie initializes, the discriminated union persists, and
	// the type guards narrow correctly when reading back.
	// Delete this route when the real screens land (Session 8 or 9).

	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import {
		isPersonal,
		newId,
		nowIso,
		type PersonalSession,
		type Session,
		type Tin
	} from '$lib/db/types';
	import { tinRemaining } from '$lib/tins/compute';
	import { formatRatio } from '$lib/sessions/compute';

	let tins = $state<Tin[]>([]);
	let sessions = $state<Session[]>([]);
	let busy = $state(false);
	let status = $state('');

	async function refresh() {
		tins = await repository.listTins();
		sessions = await repository.listSessions();
	}

	async function addTin() {
		busy = true;
		const t: Tin = {
			id: newId(),
			name: 'Eiju',
			maker: 'Marukyu Kōyamaen',
			grade: 'ceremonial',
			region: 'uji',
			cultivar: 'Asahi',
			weightGrams: 30,
			openedAt: nowIso(),
			archived: false,
			createdAt: nowIso(),
			updatedAt: nowIso()
		};
		await repository.saveTin(t);
		status = `Saved tin ${t.id.slice(0, 8)}…`;
		await refresh();
		busy = false;
	}

	async function addPersonalSession() {
		const activeTin = tins.find((t) => !t.archived);
		if (!activeTin) {
			status = 'Add a tin first';
			return;
		}
		busy = true;
		const s: PersonalSession = {
			id: newId(),
			kind: 'personal',
			brewedAt: nowIso(),
			style: 'usucha',
			tinId: activeTin.id,
			powderGrams: 2,
			waterGrams: 60,
			waterTempC: 76,
			whisk: 'chasen-100',
			rating: 4,
			createdAt: nowIso(),
			updatedAt: nowIso()
		};
		await repository.saveSession(s);
		status = `Saved personal session ${s.id.slice(0, 8)}…`;
		await refresh();
		busy = false;
	}

	async function addStoreSession() {
		busy = true;
		const s: Session = {
			id: newId(),
			kind: 'store',
			brewedAt: nowIso(),
			style: 'latte',
			milk: 'oat',
			storeName: 'Stonemill',
			region: 'uji',
			priceCents: 750,
			priceCurrency: 'USD',
			rating: 4,
			createdAt: nowIso(),
			updatedAt: nowIso()
		};
		await repository.saveSession(s);
		status = `Saved store session ${s.id.slice(0, 8)}…`;
		await refresh();
		busy = false;
	}

	async function clearAll() {
		if (!confirm('Clear all tins and sessions?')) return;
		busy = true;
		for (const s of sessions) await repository.deleteSession(s.id);
		// no deleteTin yet — archive instead so the data path is exercised.
		for (const t of tins) await repository.archiveTin(t.id);
		status = 'Cleared (tins archived, sessions deleted)';
		await refresh();
		busy = false;
	}

	onMount(refresh);
</script>

<main class="mx-auto max-w-md px-6 py-12">
	<div class="eyebrow">DEV · repository smoke test</div>
	<h1 class="text-ink mt-2 font-display text-[28px] italic leading-[1.1] tracking-[-0.015em]">
		Phase-1 storage
	</h1>

	<div class="bg-hairline my-6 h-px"></div>

	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			disabled={busy}
			onclick={addTin}
			class="border-rule text-ink rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.10em] uppercase disabled:opacity-50"
		>
			+ tin
		</button>
		<button
			type="button"
			disabled={busy}
			onclick={addPersonalSession}
			class="border-rule text-ink rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.10em] uppercase disabled:opacity-50"
		>
			+ personal
		</button>
		<button
			type="button"
			disabled={busy}
			onclick={addStoreSession}
			class="border-rule text-ink rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.10em] uppercase disabled:opacity-50"
		>
			+ store
		</button>
		<button
			type="button"
			disabled={busy}
			onclick={clearAll}
			class="border-rule text-faint rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.10em] uppercase disabled:opacity-50"
		>
			clear
		</button>
	</div>

	{#if status}
		<p class="text-muted mt-3 font-mono text-[11px]">{status}</p>
	{/if}

	<div class="bg-hairline my-7 h-px"></div>

	<div class="eyebrow">Tins · {tins.length}</div>
	<ul class="mt-2 space-y-2">
		{#each tins as t (t.id)}
			{@const personalForTin = sessions.filter(isPersonal).filter((s) => s.tinId === t.id)}
			<li class="border-hairline flex items-baseline justify-between border-b py-2">
				<span class="text-ink font-display text-[18px] italic">{t.name}</span>
				<span class="text-data font-mono text-[13px] tabular-nums">
					{tinRemaining(t, personalForTin)}<span class="text-muted text-[10px]"> / {t.weightGrams}g</span>
				</span>
			</li>
		{/each}
	</ul>

	<div class="bg-hairline my-7 h-px"></div>

	<div class="eyebrow">Sessions · {sessions.length}</div>
	<ul class="mt-2 space-y-2">
		{#each sessions as s (s.id)}
			<li class="border-hairline border-b py-2">
				<div class="flex items-baseline justify-between">
					<span class="eyebrow !text-faint">{s.kind} · {s.style}</span>
					<span class="text-muted font-mono text-[10px]">{s.brewedAt.slice(11, 16)}</span>
				</div>
				{#if isPersonal(s)}
					<div class="text-ink mt-1 font-mono text-[13px] tabular-nums">
						{s.powderGrams}g · {s.waterGrams}g · {s.waterTempC}°C · {formatRatio(s)}
					</div>
				{:else}
					<div class="text-ink mt-1 font-mono text-[13px]">
						{s.storeName} · {s.region}{s.priceCents
							? ' · $' + (s.priceCents / 100).toFixed(2)
							: ''}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</main>
