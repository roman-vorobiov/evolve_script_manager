<script lang="ts">
    import ConfigBrowserItemForm from "./ConfigBrowserItemForm.svelte";
    import { File } from "lucide-svelte";

    import type { State, Config } from "./core/state";

    export let state: State;
    export let callback: () => void;

    let config: Config = {
        name: "",
        source: ""
    }

    function onFinishedEditing() {
        state.configs.push(config);
        state.activeConfig = config.name;
        callback();
    }

    function stopEditing() {
        callback();
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            stopEditing();
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown}/>

<button class="p-1 w-full hover:bg-secondary select-none flex align-center">
    <div>
        <File class="size-4 mt-[4px] mr-2 ml-1"/>
    </div>
    <ConfigBrowserItemForm
        {state}
        bind:config={config}
        on:focusout={stopEditing}
        callback={onFinishedEditing}
    />
</button>

