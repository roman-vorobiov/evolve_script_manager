import defaultConfig from "$lib/assets/default.json";

import { toast } from "svelte-sonner";

import type { Config } from "$lib/core/domain/model";

export async function copyToClipboard(config: Config) {
    const serialized = JSON.stringify({...defaultConfig, ...config});
    await navigator.clipboard.writeText(serialized).then(() => toast.success("Copied!"));
}
