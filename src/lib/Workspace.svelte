<script lang="ts">
    import Compiler from "$lib/workers/compiler.worker?worker";

    import Editor from "./Editor.svelte";

    import type { State } from "$lib/core/state";
    import type { Config } from "$lib/core/domain/model";
    import type { ProblemInfo, CompileResult } from "$lib/core/dsl";

    export let state: State;
    export let compiledConfig: Config;

    let errors: ProblemInfo[] = [];

    const compiler = new Compiler();
    compiler.onmessage = ({ data }: MessageEvent<CompileResult>) => {
        errors = data.errors;
        if (data.config !== null) {
            compiledConfig = data.config;
        }
    };

    $: model = Object.fromEntries(state.configs.map(cfg => [cfg.name, cfg.source]));

    $: {
        if (state.activeConfig !== null) {
            compiler.postMessage({ model, target: state.activeConfig });
        }
    }
</script>

{#each state.configs as config}
    {#if config.name === state.activeConfig}
        <Editor {state} bind:config={config} {errors}/>
    {/if}
{/each}

