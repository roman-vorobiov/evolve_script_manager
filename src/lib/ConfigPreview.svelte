<script lang="ts">
    import * as ScrollArea from "$lib/components/ui/scroll-area";

    import defaultSettings from "$lib/assets/default.json";
    import { lDifference } from '$lib/core/utils';

    export let config: any;
    export let diffOnly: boolean = false;

    $: view = diffOnly ? lDifference(config, defaultSettings) : config;

    $: str = JSON.stringify(view, null, 4);
</script>

<ScrollArea.Root class="size-full">
    <p class="font-mono text-sm whitespace-pre-wrap p-6">{str}</p>

    <ScrollArea.Scrollbar orientation="vertical" class="w-4"/>
</ScrollArea.Root>
