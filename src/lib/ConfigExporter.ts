import defaultConfig from "$lib/assets/default.json";

import { toast } from "svelte-sonner";

import type { Config } from "$lib/core/domain/model";

function serialize(config: Config) {
    return JSON.stringify({...defaultConfig, ...config});
}

export async function copyToClipboard(config: Config) {
    const serialized = serialize(config);
    await navigator.clipboard.writeText(serialized).then(() => toast.success("Copied!"));
}

export function download(config: Config, name: string) {
    const serialized = serialize(config);

    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(serialized)}`);
    element.setAttribute("download", name);

    element.click();
}

export function applyToEvolve(config: Config) {
    const impl = (window as any).sendMessageToEvolveTab;

    if (impl !== undefined) {
        const serialized = serialize(config);

        impl({ config: serialized });

        toast.success("Config applied!");
    }
}
