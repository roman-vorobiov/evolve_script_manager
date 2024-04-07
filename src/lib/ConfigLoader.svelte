<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";

    export let config;

    let text = "";
    let dialogOpen = false;

    function parseConfig() {
        try {
            let value = JSON.parse(text);
            if (value instanceof Object && !Array.isArray(value)) {
                config = value;
                value = "";
                dialogOpen = false;
            }
        }
        catch (e) {
        }
    }
</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger>
        <Button variant="outline" class="text-button">
            <slot/>
        </Button>
    </Dialog.Trigger>
    <Dialog.Content variant="bare">
        <Dialog.Header>
            <Dialog.Title>Import from a string</Dialog.Title>
        </Dialog.Header>

        <Textarea class="resize-none overflow-hidden" bind:value={text} placeholder="Paste your config here"/>

        <Dialog.Footer>
            <Button variant="outline" class="text-button" on:click={parseConfig}>Import</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
