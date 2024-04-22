<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import debounce from "lodash/debounce";

    import loader from "@monaco-editor/loader";
    import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

    import { initializeSyntax } from "$lib/core/dsl/syntax/monaco";
    import { type State } from "$lib/core/state";

    export let state: State;

    let editor: Monaco.editor.IStandaloneCodeEditor;
    let monaco: typeof Monaco;
    let editorContainer: HTMLElement;

    onMount(async () => {
        const monacoEditor = await import("monaco-editor");
        loader.config({ monaco: monacoEditor.default });

        monaco = await loader.init();

        initializeSyntax(monaco);

        editor = monaco.editor.create(editorContainer, {
            automaticLayout: true
        });

        const model = monaco.editor.createModel(state.config, "vollch");
        editor.setModel(model);

        parseCurrentValue();
    });

    onDestroy(() => {
        monaco?.editor.getModels().forEach((model) => model.dispose());
        editor?.dispose();
    });

    function parseCurrentValue() {
        state.config = editor.getValue();
    }

    let onInput = debounce(parseCurrentValue, 500);
</script>

<div class="size-full" on:input={onInput} bind:this={editorContainer}></div>
