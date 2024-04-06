<script lang="ts">
    import ConfigLoader from "$lib/ConfigLoader.svelte";
    import ConfigDisplay from "$lib/ConfigDisplay.svelte";
    import { saveState, loadState } from "$lib/core/persistence";
    import { type State } from "$lib/core/state";

    let state: State = loadState();

    $: {
        saveState(state);
    }
</script>

<ConfigLoader bind:config={state.config}/>

{#if state.config !== null}
    <ConfigDisplay config={state.config}/>
{/if}
