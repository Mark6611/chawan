<script lang="ts">
	// Magic-link OTP sign-in. Two phases: email → send code, otp → verify.
	// Supabase sends an email containing both a clickable magic link AND a
	// numeric code; either path lands the user signed in.
	//
	// If already signed in, redirect to settings (the door the user came
	// from in the common case).

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { auth } from '$lib/auth.svelte';

	// If Supabase isn't configured, surface a friendly "not configured"
	// state instead of pretending the form will do something.

	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Display from '$lib/components/Display.svelte';
	import Mono from '$lib/components/Mono.svelte';
	import Hairline from '$lib/components/Hairline.svelte';
	import Field from '$lib/components/Field.svelte';
	import PrimaryButton from '$lib/components/PrimaryButton.svelte';

	type Phase = 'email' | 'otp';

	let email = $state('');
	let otpCode = $state('');
	let phase = $state<Phase>('email');
	let sending = $state(false);
	let verifying = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		if (auth.user) goto('/settings');
	});

	async function sendCode(e: SubmitEvent) {
		e.preventDefault();
		if (!supabase) return;
		error = null;
		sending = true;
		const { error: err } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
		});
		if (err) {
			error = err.message;
		} else {
			phase = 'otp';
			otpCode = '';
		}
		sending = false;
	}

	async function verifyCode(e: SubmitEvent) {
		e.preventDefault();
		if (!supabase) return;
		error = null;
		verifying = true;
		const { error: err } = await supabase.auth.verifyOtp({
			email: email.trim(),
			token: otpCode.trim(),
			type: 'email'
		});
		if (err) {
			error = err.message;
			verifying = false;
		} else {
			await goto('/');
		}
	}

	function back() {
		phase = 'email';
		otpCode = '';
		error = null;
	}
</script>

<svelte:head>
	<title>Sign in · Chawan</title>
</svelte:head>

<main class="mx-auto max-w-md px-6 py-12 pb-28">
	<a
		href="/settings"
		class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
	>
		← back
	</a>

	<div class="mt-8">
		<Eyebrow>Account</Eyebrow>
		<div class="mt-2">
			<Display size="l">{phase === 'email' ? 'Sign in.' : 'Check your email.'}</Display>
		</div>
	</div>

	{#if !auth.enabled}
		<p class="text-muted mt-4 max-w-[36ch] text-[14px] italic leading-relaxed">
			Supabase isn't configured for this install. Add
			<code class="text-ink not-italic">VITE_SUPABASE_URL</code> and
			<code class="text-ink not-italic">VITE_SUPABASE_PUBLISHABLE_KEY</code> to
			<code class="text-ink not-italic">.env.local</code> (see
			<code class="text-ink not-italic">.env.example</code>) and restart the dev server.
		</p>
	{:else if phase === 'email'}
		<p class="text-muted mt-4 max-w-[36ch] text-[14px] italic leading-relaxed">
			Sign in to sync sessions across devices. Your local data stays put — it'll migrate to
			your account on first sign-in.
		</p>

		<Hairline class="my-7" />

		<form onsubmit={sendCode}>
			<Field label="Email">
				<input
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					placeholder="you@example.com"
					class="text-ink placeholder:text-faint font-body w-full text-[16px]"
				/>
			</Field>

			{#if error}
				<div class="border-danger mt-4 rounded-[14px] border-[0.5px] px-4 py-3">
					<Mono size="meta" tone="ink">{error}</Mono>
				</div>
			{/if}

			<div class="mt-8">
				<PrimaryButton type="submit" disabled={sending || !email.trim()}>
					{sending ? 'Sending…' : 'Send code'}
				</PrimaryButton>
			</div>
		</form>
	{:else}
		<p class="text-muted mt-4 max-w-[36ch] text-[14px] italic leading-relaxed">
			A code went to <span class="text-ink not-italic">{email}</span>. Open the email and
			either tap the link or paste the code below.
		</p>

		<Hairline class="my-7" />

		<form onsubmit={verifyCode}>
			<Field label="Code from email">
				{#snippet action()}
					<Mono size="meta" tone="faint">6–8 digits</Mono>
				{/snippet}
				<input
					type="text"
					bind:value={otpCode}
					required
					inputmode="numeric"
					autocomplete="one-time-code"
					pattern="[0-9]*"
					maxlength="10"
					placeholder="00000000"
					class="text-ink placeholder:text-faint w-full text-center font-mono text-[24px] tracking-[0.25em] tabular-nums"
				/>
			</Field>

			{#if error}
				<div class="border-danger mt-4 rounded-[14px] border-[0.5px] px-4 py-3">
					<Mono size="meta" tone="ink">{error}</Mono>
				</div>
			{/if}

			<div class="mt-8">
				<PrimaryButton
					type="submit"
					disabled={verifying || otpCode.trim().length < 6}
				>
					{verifying ? 'Verifying…' : 'Verify'}
				</PrimaryButton>
			</div>

			<div class="mt-6 text-center">
				<button
					type="button"
					onclick={back}
					class="text-muted hover:text-ink font-mono text-[11px] tracking-[0.10em] uppercase"
				>
					← use a different email
				</button>
			</div>
		</form>
	{/if}
</main>
