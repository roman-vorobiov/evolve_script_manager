<script lang="ts">
    import ConfigLoader from "$lib/ConfigLoader.svelte";
    import ConfigDisplay from "$lib/ConfigDisplay.svelte";

    let config: any | null = null;
</script>

{#if config === null}
    <ConfigLoader bind:config={config}/>
{:else}
    <ConfigDisplay {config}/>
{/if}
