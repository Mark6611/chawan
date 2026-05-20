<script lang="ts">
	// Full-width pill button. Three kinds:
	//   tea   — filled accent; the primary CTA on a screen
	//   line  — hairline outline; the secondary action
	//   ghost — no border, ink text; the tertiary or "back" affordance

	import type { Snippet } from 'svelte';

	type Kind = 'tea' | 'line' | 'ghost';

	let {
		kind = 'tea',
		type = 'button',
		onclick,
		disabled = false,
		ariaLabel,
		children
	}: {
		kind?: Kind;
		type?: 'button' | 'submit' | 'reset';
		onclick?: () => void;
		disabled?: boolean;
		ariaLabel?: string;
		children: Snippet;
	} = $props();

	const kindClass: Record<Kind, string> = {
		tea: 'bg-tea text-on-tea',
		line: 'border-rule text-ink border bg-transparent',
		ghost: 'text-ink bg-transparent'
	};
</script>

<button
	{type}
	{onclick}
	{disabled}
	aria-label={ariaLabel}
	class="w-full rounded-full px-5 py-4 font-mono text-[11.5px] font-medium tracking-[0.10em] uppercase
		transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-40
		{kindClass[kind]}"
>
	{@render children()}
</button>
