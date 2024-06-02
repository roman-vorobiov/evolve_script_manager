<script lang="ts">
    import { copyToClipboard, applyToEvolve } from "./ConfigExporter";
    import SidebarButton from "./SidebarButton.svelte";
    import {
        Files,
        Eye,
        Upload,
        FilePlus2 as FilePlus,
        ClipboardCopy,
        Settings
    } from "lucide-svelte";

    import type { State } from "$lib/core/state";
    import type { Config } from "$lib/core/domain/model";

    export let state: State;
    export let compiledConfig: Config;
    export let newConfigPending = false;

    function handleCopyToClipboard() {
        if (state.activeConfig !== null) {
            copyToClipboard(compiledConfig);
        }
    }

    function handleApplyToEvolve() {
        if (state.activeConfig !== null) {
            applyToEvolve(compiledConfig);
        }
    }
</script>

<div class="flex flex-col w-14 border-r">
    <SidebarButton
        description="Browse configs"
        icon={Files}
        on:click={() => state.browserOpen = !state.browserOpen}
    />

    <SidebarButton
        description="Show preview"
        icon={Eye}
        on:click={() => state.previewOpen = !state.previewOpen}
        disabled={state.activeConfig === null}
    />

    <div class="grow"/>

    <SidebarButton
        description="New config"
        icon={FilePlus}
        on:click={() => newConfigPending = true}
        disabled={newConfigPending}
    />

    <SidebarButton
        description="Copy to clipboard"
        icon={ClipboardCopy}
        on:click={handleCopyToClipboard}
        disabled={state.activeConfig === null}
    />

    <SidebarButton
        description="Apply config"
        icon={Upload}
        on:click={handleApplyToEvolve}
        disabled={!("sendMessageToEvolveTab" in window)}
    />

    <!-- <SidebarButton
        description="Settings"
        icon={Settings}
        disabled={true}
    /> -->
</div>
