<script lang="ts">
    import { download, copyToClipboard, applyToEvolve } from "./ConfigExporter";
    import SidebarButton from "./SidebarButton.svelte";
    import {
        Files,
        Eye,
        Upload,
        FilePlus2 as FilePlus,
        FileDown,
        ClipboardCopy,
        CircleHelp
    } from "lucide-svelte";

    import type { State } from "$lib/core/state";
    import type { Config } from "$lib/core/domain/model";

    export let state: State;
    export let compiledConfig: Config;
    export let newConfigPending = false;

    function handleDownload() {
        if (state.activeConfig !== null) {
            download(compiledConfig, state.activeConfig);
        }
    }

    async function handleCopyToClipboard() {
        if (state.activeConfig !== null) {
            await copyToClipboard(compiledConfig);
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
        description="Download"
        icon={FileDown}
        on:click={handleDownload}
        disabled={state.activeConfig === null}
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
        disabled={state.activeConfig === null || !("sendMessageToEvolveTab" in window)}
    />

    <SidebarButton
        description="About"
        icon={CircleHelp}
        href="https://github.com/roman-vorobiov/evolve_script_manager"
    />
</div>
