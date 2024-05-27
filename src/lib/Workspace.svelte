<script lang="ts">
    import Compiler from "$lib/workers/compiler.worker?worker";

    import Editor from "$lib/Editor.svelte";

    import type { State } from "$lib/core/state";
    import type { ProblemInfo, CompileResult } from "$lib/core/dsl";

    export let state: State;
    export let config: any;

    $: view = JSON.stringify(config, null, 4);

    let errors: ProblemInfo[] = [];

    const compiler = new Compiler();
    compiler.onmessage = ({ data }: MessageEvent<CompileResult>) => {
        errors = data.errors;
        if (data.config !== null) {
            config = data.config;
        }
    };

    $: {
        compiler.postMessage({ source: state.config });
    }
</script>

<div class="flex flex-row h-full">
    <div class="w-3/5 h-full">
        <Editor bind:state={state} {errors}></Editor>
    </div>
    <div class="w-2/5 h-full">
        <p class="font-mono text-sm whitespace-pre-wrap p-6">{view}</p>
    </div>
</div>
