<script lang="ts">
	// 0.5px-feeling structural line. Rendered as 1px at low alpha because
	// most browsers can't sub-pixel a stroke reliably; the perceived weight
	// is the same when the alpha is low (--color-hairline is ~9% ink).

	let {
		rule = false,
		class: cls = ''
	}: {
		/** Heavier section divider — uses --color-rule (~18% ink) instead of hairline. */
		rule?: boolean;
		class?: string;
	} = $props();
</script>

<div class="h-px w-full {rule ? 'bg-rule' : 'bg-hairline'} {cls}"></div>
