<script lang="ts">
    import { Button } from "$lib/components/ui/button";

    function importConfig() {
        console.log("hello");
    }
</script>

<svelte:head>
    <title>Evolve Script Manager</title>
</svelte:head>

<Button variant="outline" class="text-button" on:click={importConfig}>Import</Button>
