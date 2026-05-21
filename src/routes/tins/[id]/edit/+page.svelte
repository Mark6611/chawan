<script lang="ts">
	// Loads the tin by id, then hands it to TinForm in edit mode.
	// Keep the "loading" + "not found" shells outside TinForm so the form
	// state doesn't initialize with undefined before the lookup completes.

	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import type { Tin } from '$lib/db/types';

	import Mono from '$lib/components/Mono.svelte';
	import Display from '$lib/components/Display.svelte';
	import TinForm from '$lib/components/TinForm.svelte';

	let tin = $state<Tin | null | undefined>(undefined);
	const id = $derived(page.params.id);

	async function load() {
		if (!id) return;
		tin = (await repository.getTin(id)) ?? null;
	}
	onMount(load);
</script>

{#if tin === undefined}
	<main class="mx-auto max-w-md px-6 py-12 text-center">
		<Mono size="meta" tone="muted">Loading…</Mono>
	</main>
{:else if tin === null}
	<main class="mx-auto max-w-md px-6 py-12 text-center">
		<a
			href="/tins"
			class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
		>
			← back
		</a>
		<div class="mt-8">
			<Display size="m">Tin not found.</Display>
		</div>
	</main>
{:else}
	<TinForm {tin} />
{/if}
