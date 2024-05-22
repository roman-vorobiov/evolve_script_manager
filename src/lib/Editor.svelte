<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import debounce from "lodash/debounce";

    import { loadMonaco, type Monaco } from "$lib/editor/monaco";

    import { type State } from "$lib/core/state";
    import { type ParseError } from "$lib/core/dsl";

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

        const model = monaco.editor.createModel(state.config, "DSL");
        model.updateOptions({
            tabSize: 4
        });

        model.onDidChangeContent(debounce(readCurrentValue, 500));

        editor.setModel(model);
    });

    onDestroy(() => {
        monaco?.editor.getModels().forEach(model => model.dispose());
        editor?.dispose();
    });

    $: {
        if (editor) {
            monaco.editor.setModelMarkers(editor.getModel()!, "owner", [...makeMarkers(errors)]);
        }
    }

    function* makeMarkers(errors: ParseError[]): IterableIterator<Monaco.editor.IMarkerData> {
        for (const e of errors) {
            if (e.location === undefined) {
                console.error(`Unknown location: ${e.message}`);
            }
            else {
                yield {
                    startLineNumber: e.location.start.line,
                    startColumn: e.location.start.column,
                    endLineNumber: e.location.stop.line,
                    endColumn: e.location.stop.column,
                    message: e.message,
                    severity: monaco.MarkerSeverity.Error
                }
            }
        }
    }

    function readCurrentValue() {
        state.config = editor.getValue();
    }
</script>

<div class="size-full">
    <div class="size-full" bind:this={editorContainer}></div>
</div>
