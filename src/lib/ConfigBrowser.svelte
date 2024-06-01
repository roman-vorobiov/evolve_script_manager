<script lang="ts">
    import ConfigBrowserItem from "./ConfigBrowserItem.svelte";
    import ConfigBrowserPendingItem from "./ConfigBrowserPendingItem.svelte";
    import * as ContextMenu from "$lib/components/ui/context-menu";
    import * as ScrollArea from "$lib/components/ui/scroll-area";

    import type { State } from "$lib/core/state";

    export let state: State;
    export let newConfigPending = false;

    $: configs = state.configs.slice().sort((l, r) => l.name.localeCompare(r.name));

    function onPendingStateChange() {
        newConfigPending = false;
        state = state;
    }

    let menuOpen = false;
</script>

<ScrollArea.Root orientation="both" class="size-full">
    <div class="fixed inset-0 z-40" class:hidden={!menuOpen}/>

    <div class="flex flex-col w-full h-dvh">
        {#if newConfigPending}
            <ConfigBrowserPendingItem
                bind:state={state}
                callback={onPendingStateChange}
            />
        {/if}

        {#each configs as config (config.name)}
            <ConfigBrowserItem
                bind:state={state}
                bind:config={config}
                onOpenChange={(state) => menuOpen = state}
            />
        {/each}

        <ContextMenu.Root onOpenChange={(state) => menuOpen = state}>
            <ContextMenu.Trigger class="size-full"/>
            <ContextMenu.Content>
                <ContextMenu.Item on:click={() => newConfigPending = true}>New Config</ContextMenu.Item>
                <ContextMenu.Item disabled>Import Config</ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    </div>
</ScrollArea.Root>

