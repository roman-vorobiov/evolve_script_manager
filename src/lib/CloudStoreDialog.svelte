<script lang="ts">
	import { onMount } from "svelte";
    import { createClient, type SupabaseClient } from "@supabase/supabase-js";
    import { compressToBase64, decompressFromBase64 } from "lz-string";
    import { toast } from "svelte-sonner";

    import { serialize, deserialize, saveState } from "./core/persistence";
    import type { State } from "$lib/core/state";

    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { Input } from "$lib/components/ui/input";

    export let state: State;

    const tableName = "evolve_config_manager";
    const credentialsKey = "esm.cloud_credentials";

    let cloudDialogOpen = false;
    let formValue = { url: "", key: "" };
    let client: SupabaseClient | undefined = undefined;

    function openDialog() {
        cloudDialogOpen = true;
    }

    async function authenticate(url: string, key: string) {
        client = createClient(url, key);

        const { error } = await client
            .from(tableName)
            .select("id");

        if (error) {
            localStorage.removeItem(credentialsKey);
            client = undefined;
            console.error(error);
            return false;
        }
        else {
            return true;
        }
    }

    export async function upload() {
        if (!client) {
            openDialog();
            return;
        }

        const decoded = JSON.stringify(serialize(state));
        const encoded = compressToBase64(decoded);

        const { error } = await client
            .from(tableName)
            .insert({ data: encoded });

        if (error) {
            console.error(error);
        }
        else {
            toast.success("Upload successful");
        }
    }

    export async function download() {
        if (!client) {
            openDialog();
            return;
        }

        const { data, error } = await client
            .from(tableName)
            .select("data")
            .order("updated_at", { ascending: false })
            .limit(1);

        if (error) {
            console.error(error);
        }
        else {
            const encoded = data[0].data as string;
            const decoded = decompressFromBase64(encoded);

            const newState = deserialize(JSON.parse(decoded));
            if (newState) {
                saveState(state, true);

                const configs = state.configs.slice();
                for (const config of configs) {
                    state.removeConfig(config.name);
                }
                state = state;

                for (const config of newState.configs) {
                    state.addConfig(config);
                }
                state = state;

                toast.success("Download successful");
            }
        }
    }

    async function login(event: Event) {
        if (await authenticate(formValue.url, formValue.key)) {
            localStorage.setItem(credentialsKey, JSON.stringify(formValue));
            state = state;
        }
        else {
            event.preventDefault();
        }
    }

    onMount(async () => {
        const credentials = localStorage.getItem(credentialsKey);
        if (credentials) {
            const { url, key } = JSON.parse(credentials);
            await authenticate(url, key);
        }
    });
</script>

<AlertDialog.Root bind:open={cloudDialogOpen}>
    <AlertDialog.Trigger/>

    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>Log into Supabase</AlertDialog.Title>
        </AlertDialog.Header>

        <Input bind:value={formValue.url} id="cloud-input-url" class="w-full" autocomplete="off" placeholder="URL"/>
        <Input bind:value={formValue.key} id="cloud-input-key" class="w-full" autocomplete="off" placeholder="Key"/>

        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action on:click={login}>Log In</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
