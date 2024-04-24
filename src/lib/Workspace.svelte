<script lang="ts">
    import { parse } from "$lib/core/dsl/parser";
    import { type State } from "$lib/core/state";
    import { type ParseError } from "$lib/core/dsl/parser";

    import Editor from "$lib/Editor.svelte";

    export let state: State;

    let config: any = {};
    let errors: ParseError[] = [];

    $: view = JSON.stringify(config, null, 4);

    $: {
        const result = parse(state.config);
        errors = result.errors;
        if (errors.length === 0) {
            config = result.config;
        }
    }
</script>

<div class="flex flex-row h-full">
    <div class="w-3/5 h-full">
        <Editor bind:state={state} {errors}></Editor>
    </div>
    <div class="grow h-full">
        <p class="font-mono whitespace-pre-wrap p-6">{view}</p>
    </div>
</div>
