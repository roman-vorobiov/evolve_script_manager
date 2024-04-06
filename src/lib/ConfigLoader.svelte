<script lang="ts">
    import * as Dialog from "$lib/components/ui/alert-dialog";
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";

    export let config;

    let text = "";

    function parseConfig() {
        try {
            let value = JSON.parse(text);
            if (value instanceof Object && !Array.isArray(value)) {
                config = value;
            }
        }
        catch (e) {
        }
    }
</script>

<Dialog.Root>
    <Dialog.Trigger>
        <Button variant="outline" class="text-button">Import</Button>
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Import from a string</Dialog.Title>
        </Dialog.Header>

        <Textarea class="resize-none" bind:value={text} placeholder="Paste your config here"/>

        <Dialog.Footer>
            <Dialog.Action asChild let:builder>
                <Button builders={[builder]} variant="outline" class="text-button" on:click={parseConfig}>Import</Button>
            </Dialog.Action>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
