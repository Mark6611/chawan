<script lang="ts">
	// The structural metadata label used everywhere.
	// Mono · uppercase · 10.5px · tracking-[0.14em] · color-muted (or color-data when accent).

	import type { Snippet } from 'svelte';

	let {
		accent = false,
		children
	}: {
		accent?: boolean;
		children: Snippet;
	} = $props();
</script>

<div
	class="font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase {accent
		? 'text-data'
		: 'text-muted'}"
>
	{@render children()}
</div>
