<script lang="ts">
	// Italic oldstyle serif heading at one of four sizes.
	// Per design system:
	//   xl 42px (hero — tin detail, session detail)
	//   l  34px (h1 — Today, screen titles)
	//   m  26px (h2 — card titles, modal prompts)
	//   s  20px (h3 — row titles, tin names — usually upright, not italic)

	import type { Snippet } from 'svelte';

	type Size = 'xl' | 'l' | 'm' | 's';

	let {
		size = 'l',
		italic = true,
		as = 'h1',
		children
	}: {
		size?: Size;
		italic?: boolean;
		as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
		children: Snippet;
	} = $props();

	const sizeClass: Record<Size, string> = {
		xl: 'text-[42px] leading-[1.05]',
		l: 'text-[34px] leading-[1.08]',
		m: 'text-[26px] leading-[1.1]',
		s: 'text-[20px] leading-[1.15]'
	};
</script>

<svelte:element
	this={as}
	class="text-ink font-display tracking-[-0.015em] {italic ? 'italic' : 'not-italic'} {sizeClass[
		size
	]}"
>
	{@render children()}
</svelte:element>
