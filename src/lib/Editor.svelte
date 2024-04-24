<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import debounce from "lodash/debounce";

    import { loadMonaco, type Monaco } from "$lib/editor/monaco";

    import { type State } from "$lib/core/state";
    import { type ParseError } from "$lib/core/dsl/parser";

    export let state: State;
    export let errors: ParseError[] = [];

    let editor: Monaco.editor.IStandaloneCodeEditor;
    let monaco: typeof Monaco;
    let editorContainer: HTMLElement;

    onMount(async () => {
        monaco = await loadMonaco();

        if (editorContainer === null) {
            return;
        }

        editor = monaco.editor.create(editorContainer, {
            automaticLayout: true
        });

        const model = monaco.editor.createModel(state.config, "vollch");
        editor.setModel(model);

        model.onDidChangeContent(debounce(readCurrentValue, 500));
    });

    onDestroy(() => {
        monaco?.editor.getModels().forEach(model => model.dispose());
        editor?.dispose();
    });

    $: {
        if (editor) {
            monaco.editor.setModelMarkers(editor.getModel()!, "owner", errors.map(makeMarker));
        }
    }

    function makeMarker(e: ParseError) {
        return {
            startLineNumber: e.start.line,
            startColumn: e.start.column,
            endLineNumber: e.stop.line,
            endColumn: e.stop.column,
            message: e.message,
            severity: monaco.MarkerSeverity.Error
        };
    }

    function readCurrentValue() {
        state.config = editor.getValue();
    }
</script>

<div class="size-full">
    <div class="size-full" bind:this={editorContainer}></div>
</div>
