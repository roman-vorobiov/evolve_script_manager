<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    
    import * as Utils from "$lib/core/utils";
    import defaultConfig from "$lib/assets/default.json";

    export let config: any;

    $: diff = Utils.lDifference(config, defaultConfig);

    $: view = JSON.stringify(diff, null, 4);
</script>

<Card.Root>
    <Card.Content>
        <p class="font-mono whitespace-pre-wrap">{view}</p>
    </Card.Content>
</Card.Root>
