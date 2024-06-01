<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import debounce from "lodash/debounce";

    import { loadMonaco, type Monaco } from "$lib/editor/monaco";

    import type { Config } from "$lib/core/state";
    import type { ProblemInfo } from "$lib/core/dsl";

    export let config: Config;
    export let errors: ProblemInfo[] = [];

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

        const model = monaco.editor.createModel(config.source, "DSL");
        model.updateOptions({
            tabSize: 4
        });

        model.onDidChangeContent(debounce(() => config.source = editor.getValue(), 500));

        editor.setModel(model);
    });

    onDestroy(() => {
        editor.getModel()?.dispose();
        editor?.dispose();
    });

    $: {
        if (editor) {
            monaco.editor.setModelMarkers(editor.getModel()!, "owner", [...makeMarkers(errors)]);
        }
    }

    function* makeMarkers(errors: ProblemInfo[]): IterableIterator<Monaco.editor.IMarkerData> {
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
                    severity: markerSeverity(e.type)
                }
            }
        }
    }

    function markerSeverity(problemType: ProblemInfo["type"]): Monaco.MarkerSeverity {
        if (problemType === "error") {
            return monaco.MarkerSeverity.Error;
        }
        else if (problemType === "warning") {
            return monaco.MarkerSeverity.Warning;
        }
        else {
            return monaco.MarkerSeverity.Info;
        }
    }
</script>

<div class="size-full min-w-0" bind:this={editorContainer}></div>
