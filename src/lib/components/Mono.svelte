<script lang="ts">
	// Monospace numeric / metadata text with tabular numerals by default.
	// The numeric hero on form steppers, detail screens, and consumption rails.

	import type { Snippet } from 'svelte';

	type Size = 'xl' | 'l' | 'm' | 'meta';
	type Weight = 'light' | 'normal' | 'medium';
	type Tone = 'ink' | 'data' | 'muted' | 'faint' | 'tea';

	let {
		size = 'm',
		weight = 'normal',
		tone = 'ink',
		children
	}: {
		size?: Size;
		weight?: Weight;
		tone?: Tone;
		children: Snippet;
	} = $props();

	const sizeClass: Record<Size, string> = {
		xl: 'text-[42px] leading-[1.0]',
		l: 'text-[26px] leading-[1.1]',
		m: 'text-[16px] leading-[1.25]',
		meta: 'text-[11px] leading-[1.3]'
	};

	const weightClass: Record<Weight, string> = {
		light: 'font-light',
		normal: 'font-normal',
		medium: 'font-medium'
	};

	const toneClass: Record<Tone, string> = {
		ink: 'text-ink',
		data: 'text-data',
		muted: 'text-muted',
		faint: 'text-faint',
		tea: 'text-tea'
	};
</script>

<span class="font-mono tabular-nums {sizeClass[size]} {weightClass[weight]} {toneClass[tone]}">
	{@render children()}
</span>
