<script lang="ts">
	// Form field row: eyebrow label · optional inline action · slotted value/control below.
	// Bottom hairline gives the structural grid; remove it on the last field per group.

	import type { Snippet } from 'svelte';
	import Eyebrow from './Eyebrow.svelte';

	let {
		label,
		action,
		hairline = true,
		children
	}: {
		label: string;
		action?: Snippet;
		hairline?: boolean;
		children: Snippet;
	} = $props();
</script>

<div
	class="field-wrapper flex flex-col gap-2 py-[14px] {hairline ? 'border-hairline border-b' : ''}"
>
	<div class="flex items-baseline justify-between gap-3">
		<Eyebrow>{label}</Eyebrow>
		{#if action}{@render action()}{/if}
	</div>
	<div>{@render children()}</div>
</div>
