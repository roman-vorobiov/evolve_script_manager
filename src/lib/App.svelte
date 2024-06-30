<script lang="ts">
    import { saveState, loadState } from "$lib/core/persistence";

    import Sidebar from "./Sidebar.svelte";
    import Workspace from "./Workspace.svelte";
    import ConfigBrowser from "./ConfigBrowser.svelte";
    import ConfigPreview from "./ConfigPreview.svelte";
    import * as Resizable from "$lib/components/ui/resizable";

    import type { State } from "$lib/core/state";

    let state: State = loadState();
    let compiledConfig: any = {};

    let newConfigPending = false;

    $: isEmpty = state.activeConfig === null;

    $: {
        saveState(state);
    }
</script>

<div class="flex w-full h-dvh">
    <Sidebar bind:state={state} {compiledConfig} bind:newConfigPending={newConfigPending}/>

    <Resizable.PaneGroup direction="horizontal" autoSaveId="tabs">
        {#if state.browserOpen || newConfigPending}
            <Resizable.Pane order={1} defaultSize={20}>
                <ConfigBrowser bind:state={state} bind:newConfigPending={newConfigPending}/>
            </Resizable.Pane>
            <Resizable.Handle withHandle/>
        {/if}

        <Resizable.Pane order={2}>
            <Workspace bind:state={state} bind:compiledConfig={compiledConfig}/>
        </Resizable.Pane>

        {#if !isEmpty && state.previewOpen}
            <Resizable.Handle withHandle />
            <Resizable.Pane order={3} defaultSize={30}>
                <ConfigPreview config={compiledConfig}/>
            </Resizable.Pane>
        {/if}
    </Resizable.PaneGroup>
</div>
