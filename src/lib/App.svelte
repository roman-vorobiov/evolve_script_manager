<script lang="ts">
    import { saveState, loadState } from "$lib/core/persistence";
    import { type State } from "$lib/core/state";

    import ConfigLoader from "$lib/ConfigLoader.svelte";
    import Workspace from "$lib/Workspace.svelte";

    let state: State = loadState();

    $: {
        saveState(state);
    }
</script>

<div class="flex flex-col h-dvh">
    <div class="border-b">
        <div class="flex h-16 items-center px-4 space-x-4">
            <ConfigLoader bind:config={state.config}>Import Config</ConfigLoader>
        </div>
    </div>

    <Workspace bind:state={state}></Workspace>
</div>
