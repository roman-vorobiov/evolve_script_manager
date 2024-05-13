<script lang="ts">
    import defaultConfig from "$lib/assets/default.json";

    import { Button } from "$lib/components/ui/button";
    import { toast } from "svelte-sonner";

    export let config: any;

    async function copyToClipboard() {
        const serialized = JSON.stringify({...defaultConfig, ...config});
        await navigator.clipboard.writeText(serialized).then(() => toast.success("Copied!"));
    }
</script>

<Button variant="outline" class="text-button" on:click={copyToClipboard}>Copy to Clipboard</Button>
