<script lang="ts">
    import { saveState, loadState } from "$lib/core/persistence";
    import { type State } from "$lib/core/state";

    import ConfigExporter from "$lib/ConfigExporter.svelte";
    import Workspace from "$lib/Workspace.svelte";

    let state: State = loadState();
    let config: any = {};

    $: {
        saveState(state);
    }
</script>

<div class="flex flex-col h-dvh">
    <div class="border-b">
        <div class="flex h-16 items-center px-4 space-x-4">
            <ConfigExporter {config}></ConfigExporter>
        </div>
    </div>

    <Workspace bind:state={state} bind:config={config}></Workspace>
</div>
