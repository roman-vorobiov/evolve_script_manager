<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Tooltip from "$lib/components/ui/tooltip";

    export let icon;
    export let description: string;
    export let disabled: boolean = false;
</script>

<Tooltip.Root group="sidebar" openDelay={300}>
    <Tooltip.Trigger {disabled}>
        <Button {disabled} variant="ghost" class="p-0 size-14" on:click>
            <svelte:component this={icon} color="#18181B" size="40" strokeWidth="1.5"/>
        </Button>
    </Tooltip.Trigger>
    <Tooltip.Content side="right">
        {description}
    </Tooltip.Content>
</Tooltip.Root>
