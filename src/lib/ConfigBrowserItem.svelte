<script lang="ts">
    import ConfigBrowserItemForm from "./ConfigBrowserItemForm.svelte";
    import * as ContextMenu from "$lib/components/ui/context-menu";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { FileText, FileJson } from "lucide-svelte";

    import type { State, Config } from "./core/state";

    export let state: State;
    export let config: Config;
    export let onOpenChange: (state: boolean) => void;

    let editable = false;

    $: active = config.name === state.activeConfig;

    $: Icon = config.name.endsWith(".json") ? FileJson : FileText;

    function makeActive() {
        if (!editable) {
            state.setActive(config);
            state = state;
        }
    }

    function startEditing() {
        editable = true;
    }

    function stopEditing() {
        editable = false;
    }

    function removeConfig() {
        if (state.removeConfig(config)) {
            state = state;
        }
    }

    type KeyHandlerAction = () => void;
    type KeyHandler = { key: string, action: KeyHandlerAction };

    const editCancel = { key: "Escape", action: stopEditing };
    const editTrigger = { key: "F2", action: startEditing };

    const keyHandlers: Record<string, KeyHandlerAction> = {};
    addKeyHandler(editCancel);

    function addKeyHandler(handler: KeyHandler) {
        keyHandlers[handler.key] = handler.action;
    }

    function removeKeyHandler(handler: KeyHandler) {
        delete keyHandlers[handler.key];
    }

    function handleKeyDown(event: KeyboardEvent) {
        keyHandlers[event.key]?.();
    }
</script>

<AlertDialog.Root>
    <ContextMenu.Root {onOpenChange}>
        <ContextMenu.Trigger>
            <button
                class="p-1 w-full hover:bg-secondary select-none flex align-center"
                class:bg-accent={active}
                on:click={makeActive}
                on:keydown={handleKeyDown}
                on:focusin={() => addKeyHandler(editTrigger)}
                on:focusout={() => removeKeyHandler(editTrigger)}
            >
                <div>
                    <Icon class="size-4 mt-[4px] mr-2 ml-1"/>
                </div>
                {#if editable}
                    <ConfigBrowserItemForm
                        bind:state={state}
                        bind:config={config}
                        on:focusout={stopEditing}
                        callback={stopEditing}
                    />
                {:else}
                    <p>{config.name}</p>
                {/if}
            </button>
        </ContextMenu.Trigger>

        <ContextMenu.Content>
            <ContextMenu.Item on:click={startEditing}>Rename</ContextMenu.Item>
            <AlertDialog.Trigger class="size-full">
                <ContextMenu.Item>Delete</ContextMenu.Item>
            </AlertDialog.Trigger>
        </ContextMenu.Content>
    </ContextMenu.Root>

    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Are you sure you want to delete '{config.name}'?</AlertDialog.Title>
            <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action on:click={removeConfig}>Delete</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
