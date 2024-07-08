import { fromSource } from "$lib/core/dsl";

import type { CompileResult } from "$lib/core/dsl";
import type { Config } from '$lib/core/state';

type Request = {
    configs: Config[],
    target: string
}

function compileDSL({ configs, target }: Request): CompileResult {
    const model = Object.fromEntries(configs.map(cfg => [cfg.name, cfg.source]));
    return fromSource(model, target);
}

function compileJSON(source: string): CompileResult {
    try {
        const config = JSON.parse(source);
        return {
            config,
            errors: []
        };
    }
    catch (e: any) {
        return {
            config: null,
            errors: []
        };
    }
}

onmessage = ({ data }: MessageEvent<Request>) => {
    const targetConfig = data.configs.find(cfg => cfg.name === data.target);

    if (targetConfig?.name.endsWith("json")) {
        postMessage(compileJSON(targetConfig.source));
    }
    else {
        postMessage(compileDSL(data));
    }
};

export {};
