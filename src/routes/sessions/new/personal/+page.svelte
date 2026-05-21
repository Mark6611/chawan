<script lang="ts">
	// Thin wrapper around PersonalSessionForm in "new" mode.
	// The real form logic lives in $lib/components/PersonalSessionForm.svelte
	// and is shared with /sessions/[id]/edit.

	import PersonalSessionForm from '$lib/components/PersonalSessionForm.svelte';
</script>

<PersonalSessionForm />
