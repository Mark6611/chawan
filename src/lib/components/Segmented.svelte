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

	// Roving tabindex: exactly one option is a Tab stop (the selected one, or the
	// first if nothing is selected). Arrow keys move + select, matching the
	// radiogroup contract this control advertises to assistive tech.
	let btns = $state<HTMLButtonElement[]>([]);
	const focusIndex = $derived(
		Math.max(
			0,
			options.findIndex((o) => o.value === value)
		)
	);

	function select(v: string) {
		value = v;
		onchange?.(v);
	}

	function onkeydown(e: KeyboardEvent, i: number) {
		const last = options.length - 1;
		let next: number;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
		else return;
		e.preventDefault();
		select(options[next].value);
		btns[next]?.focus();
	}
</script>

<div class="flex border-y border-hairline" role="radiogroup">
	{#each options as opt, i (opt.value)}
		{@const selected = value === opt.value}
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			tabindex={i === focusIndex ? 0 : -1}
			bind:this={btns[i]}
			onclick={() => select(opt.value)}
			onkeydown={(e) => onkeydown(e, i)}
			class="flex flex-1 items-center justify-center gap-2 py-3 font-mono text-[11.5px] tracking-[0.10em] uppercase
				{selected ? 'text-tea' : 'text-muted hover:text-ink'}
				{i > 0 ? 'border-l border-hairline' : ''}"
		>
			{#if selected}
				<span class="h-1 w-1 rounded-full bg-tea" aria-hidden="true"></span>
			{/if}
			{opt.label}
		</button>
	{/each}
</div>
