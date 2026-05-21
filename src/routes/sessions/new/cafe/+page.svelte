<script lang="ts">
	// Thin wrapper around CafeSessionForm in "new" mode. The real form logic
	// lives in $lib/components/CafeSessionForm.svelte and is shared with
	// /sessions/[id]/edit.

	import CafeSessionForm from '$lib/components/CafeSessionForm.svelte';
</script>

<CafeSessionForm />
