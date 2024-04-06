<script lang="ts">
    import * as Card from "$lib/components/ui/card";

    export let config: any;

    $: view = JSON.stringify(config, null, 4);
</script>

<Card.Root>
    <Card.Content>
        <p class="font-mono whitespace-pre-wrap">{view}</p>
    </Card.Content>
</Card.Root>
