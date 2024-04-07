<script lang="ts">
    import defaultConfig from "$lib/assets/default.json";
    import * as Utils from "$lib/core/utils";

    export let config: any;

    $: diff = Utils.lDifference(config, defaultConfig);

    $: view = JSON.stringify(diff, null, 4);
</script>

<p class="font-mono whitespace-pre-wrap p-6">{view}</p>
