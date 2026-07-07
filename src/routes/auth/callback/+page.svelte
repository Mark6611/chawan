<script lang="ts">
	// Magic-link landing page. Supabase auto-detects the session in the
	// URL hash on init; we listen for SIGNED_IN (or an existing INITIAL_SESSION)
	// and redirect home. After 4s with no session we surface an error.

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Chawan from '$lib/components/Chawan.svelte';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let errorMsg = $state<string | null>(null);

	onMount(() => {
		if (!supabase) {
			status = 'error';
			errorMsg = 'Sign-in is temporarily unavailable. Please try again later.';
			return;
		}
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
				status = 'success';
				setTimeout(() => goto('/'), 400);
			}
		});

		supabase.auth.getSession().then(({ data, error }) => {
			if (error) {
				status = 'error';
				errorMsg = error.message;
				return;
			}
			if (data.session) {
				status = 'success';
				setTimeout(() => goto('/'), 400);
				return;
			}
			// No session yet — give Supabase a moment to process the URL hash.
			setTimeout(() => {
				if (status === 'loading') {
					status = 'error';
					errorMsg = 'Sign-in link is invalid or expired. Try again.';
				}
			}, 4000);
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Signing in… · Chawan</title>
</svelte:head>

<main class="mx-auto max-w-md px-6 py-20 pb-28 text-center">
	<div class="flex justify-center">
		<Chawan size={72} filled={status !== 'error'} />
	</div>

	<div class="mt-8">
		{#if status === 'loading'}
			<Eyebrow>Signing in</Eyebrow>
			<div class="mt-2">
				<Display size="m">One moment…</Display>
			</div>
		{:else if status === 'success'}
			<Eyebrow>Signed in</Eyebrow>
			<div class="mt-2">
				<Display size="m">Welcome.</Display>
			</div>
		{:else}
			<Eyebrow>Sign-in failed</Eyebrow>
			<div class="mt-2">
				<Display size="m">Could not verify.</Display>
			</div>
			{#if errorMsg}
				<p class="mx-auto mt-4 max-w-[36ch] text-[14px] text-muted italic">{errorMsg}</p>
			{/if}
			<div class="mt-6">
				<a
					href="/auth"
					class="font-mono text-[11px] tracking-[0.10em] text-tea uppercase hover:text-ink"
				>
					Try again
				</a>
			</div>
		{/if}
	</div>

	{#if status === 'loading'}
		<div class="mt-6">
			<Mono size="meta" tone="faint">Verifying your link…</Mono>
		</div>
	{/if}
</main>
