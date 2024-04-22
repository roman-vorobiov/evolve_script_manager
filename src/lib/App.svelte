<script lang="ts">
    import { saveState, loadState } from "$lib/core/persistence";
    import { parse } from "$lib/core/dsl/parser";
    import { type State } from "$lib/core/state";

    import ConfigLoader from "$lib/ConfigLoader.svelte";
    import Editor from "$lib/Editor.svelte";

    let state: State = loadState();

    $: config = parse(state.config);
    $: view = JSON.stringify(config, null, 4);

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

    <div class="flex flex-row h-full">
        <div class="w-3/5 h-full">
            <Editor bind:state={state}></Editor>
        </div>
        <div class="grow h-full">
            <p class="font-mono whitespace-pre-wrap p-6">{view}</p>
        </div>
    </div>
</div>
