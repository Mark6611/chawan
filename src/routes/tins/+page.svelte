<script lang="ts">
	// Inventory — active + archived tins.

	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import { isPersonal, type PersonalSession, type Tin } from '$lib/db/types';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Chawan from '$lib/components/Chawan.svelte';
	import TinRow from '$lib/components/TinRow.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	let tins = $state<Tin[]>([]);
	let sessions = $state<PersonalSession[]>([]);
	let loaded = $state(false);

	async function load() {
		const [allTins, allSessions] = await Promise.all([
			repository.listTins(),
			repository.listSessions()
		]);
		tins = allTins;
		sessions = allSessions.filter(isPersonal);
		loaded = true;
	}
	onMount(load);

	const active = $derived(tins.filter((t) => !t.archived));
	const archived = $derived(tins.filter((t) => t.archived));
</script>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<div class="flex items-baseline justify-between">
		<div>
			<Eyebrow>Inventory</Eyebrow>
			<div class="mt-2">
				<Display size="l">Tins</Display>
			</div>
		</div>
		<a
			href="/tins/new"
			class="text-tea hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
			aria-label="Add a new tin"
		>
			+ add
		</a>
	</div>

	{#if !loaded}
		<div class="mt-16 text-center">
			<Mono size="meta" tone="muted">Loading…</Mono>
		</div>
	{:else if tins.length === 0}
		<Hairline class="my-7" />
		<div class="flex flex-col items-center text-center">
			<Chawan size={72} filled={false} />
			<div class="mt-6">
				<Display size="m">No tins yet.</Display>
			</div>
			<p class="text-muted mt-4 max-w-[26ch] text-[14px] italic">
				Add your first tin to start logging personal sessions.
			</p>
			<div class="mt-8 w-full">
				<PrimaryButton href="/tins/new">Add your first tin</PrimaryButton>
			</div>
		</div>
	{:else}
		<Hairline class="my-7" />

		{#if active.length}
			<section>
				<Eyebrow>Active · {active.length}</Eyebrow>
				<div class="border-hairline mt-2 border-t">
					{#each active as t (t.id)}
						<TinRow tin={t} {sessions} />
						<Hairline />
					{/each}
				</div>
			</section>
		{/if}

		{#if archived.length}
			{#if active.length}<Hairline rule class="my-7" />{/if}
			<section>
				<Eyebrow>Archived · {archived.length}</Eyebrow>
				<div class="border-hairline mt-2 border-t opacity-70">
					{#each archived as t (t.id)}
						<TinRow tin={t} {sessions} />
						<Hairline />
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</main>
