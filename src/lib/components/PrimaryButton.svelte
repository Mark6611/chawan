<script lang="ts">
	// Full-width CTA. Kept as a named wrapper because it reads well at the call
	// sites (a form's submit is a "primary button", not a "large tea button"),
	// but the styling now comes entirely from the iOS 27 button system in
	// Button.svelte — one place owns shape, material, and press physics.
	//
	//   tea   → filled accent, the primary CTA on a screen
	//   line  → hairline outline, the secondary action
	//   ghost → no border, ink text, the tertiary / "back" affordance

	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	type Kind = 'tea' | 'line' | 'ghost';

	let {
		kind = 'tea',
		type = 'button',
		href,
		onclick,
		disabled = false,
		ariaLabel,
		children
	}: {
		kind?: Kind;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		onclick?: () => void;
		disabled?: boolean;
		ariaLabel?: string;
		children: Snippet;
	} = $props();

	const VARIANT = { tea: 'tea', line: 'bordered', ghost: 'plain' } as const;
</script>

<Button
	size="large"
	variant={VARIANT[kind]}
	full
	{type}
	{href}
	{onclick}
	{disabled}
	label={ariaLabel}
>
	{@render children()}
</Button>
