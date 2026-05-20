<script lang="ts">
	// Segmented control: hairline top + bottom, hairline dividers between options.
	// Selected option: --color-tea text + a 4×4 dot indicator before the label.
	// No background fill (the dot is the only chrome).

	type Option = { value: string; label: string };

	let {
		options,
		value = $bindable(''),
		onchange
	}: {
		options: Option[];
		value: string;
		onchange?: (v: string) => void;
	} = $props();

	function select(v: string) {
		value = v;
		onchange?.(v);
	}
</script>

<div class="border-hairline flex border-y" role="radiogroup">
	{#each options as opt, i (opt.value)}
		{@const selected = value === opt.value}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			onclick={() => select(opt.value)}
			class="flex flex-1 items-center justify-center gap-2 py-3 font-mono text-[11.5px] tracking-[0.10em] uppercase
				{selected ? 'text-tea' : 'text-muted hover:text-ink'}
				{i > 0 ? 'border-hairline border-l' : ''}"
		>
			{#if selected}
				<span class="bg-tea h-1 w-1 rounded-full" aria-hidden="true"></span>
			{/if}
			{opt.label}
		</button>
	{/each}
</div>
