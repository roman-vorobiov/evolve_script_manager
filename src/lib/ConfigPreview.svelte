<script lang="ts">
    import * as ScrollArea from "$lib/components/ui/scroll-area";

    export let config: any;

    $: view = JSON.stringify(config, null, 4);
</script>

<ScrollArea.Root class="size-full">
    <p class="font-mono text-sm whitespace-pre-wrap p-6">{view}</p>

    <ScrollArea.Scrollbar orientation="vertical" class="w-4"/>
</ScrollArea.Root>
