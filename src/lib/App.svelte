<script lang="ts">
    import ConfigLoader from "$lib/ConfigLoader.svelte";
    import ConfigDisplay from "$lib/ConfigDisplay.svelte";

    let config: any | null = null;
</script>

<ConfigLoader bind:config={config}/>

{#if config !== null}
    <ConfigDisplay {config}/>
{/if}
