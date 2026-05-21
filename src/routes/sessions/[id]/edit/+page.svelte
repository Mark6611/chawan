<script lang="ts">
	// Edit a session — loads the record, then mounts the appropriate form
	// component in edit mode. The form decides what UI to show; this route
	// just dispatches based on `kind`.

	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { repository } from '$lib/db/repository';
	import { isCafe, isPersonal, type Session } from '$lib/db/types';

	import Mono from '$lib/components/Mono.svelte';
	import Display from '$lib/components/Display.svelte';
	import PersonalSessionForm from '$lib/components/PersonalSessionForm.svelte';
	import CafeSessionForm from '$lib/components/CafeSessionForm.svelte';

	let session = $state<Session | null | undefined>(undefined);
	const id = $derived(page.params.id);

	async function load() {
		if (!id) return;
		session = (await repository.getSession(id)) ?? null;
	}
	onMount(load);
</script>

{#if session === undefined}
	<main class="mx-auto max-w-md px-6 py-12 text-center">
		<Mono size="meta" tone="muted">Loading…</Mono>
	</main>
{:else if session === null}
	<main class="mx-auto max-w-md px-6 py-12 text-center">
		<a
			href="/sessions"
			class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
		>
			← back
		</a>
		<div class="mt-8">
			<Display size="m">Session not found.</Display>
		</div>
	</main>
{:else if isPersonal(session)}
	<PersonalSessionForm {session} />
{:else if isCafe(session)}
	<CafeSessionForm {session} />
{/if}
