<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import debounce from "lodash/debounce";

    import { loadMonaco, type Monaco } from "$lib/editor/monaco";

    import type { Config, State } from "$lib/core/state";
    import type { ProblemInfo } from "$lib/core/dsl";

    export let state: State;
    export let errors: ProblemInfo[] = [];

    let addedCallbackID: number;
    let removedCallbackID: number;
    let activeChangedCallbackID: number;

    let editor: Monaco.editor.IStandaloneCodeEditor;
    let monaco: typeof Monaco;
    let editorContainer: HTMLElement;

    function getModel(configName: string) {
        return monaco.editor.getModel(monaco.Uri.parse(`inmemory://model/${configName}`));
    }

    function changeActiveModel(config: Config | null) {
        editor?.setModel(config && getModel(config.name));
    }

    function addModel(config: Config) {
        const language = config.name.endsWith(".json") ? "json" : "DSL";

        const model = monaco.editor.createModel(config.source, language, monaco.Uri.from({
            scheme: "inmemory",
            authority: "model",
            path: `/${config.name}`
        }));

        model.updateOptions({
            tabSize: 4
        });

        model.onDidChangeContent(debounce(() => { config.source = editor.getValue(); state = state; }, 500));
    }

    function removeModel(config: Config) {
        getModel(config.name)?.dispose();
    }

    onMount(async () => {
        monaco = await loadMonaco(state);

        if (editorContainer === null) {
            return;
        }

        editor = monaco.editor.create(editorContainer, {
            automaticLayout: true
        });

        for (const config of state.configs) {
            addModel(config);
        }

        if (state.activeConfig !== null) {
            editor.setModel(getModel(state.activeConfig));
        }

        addedCallbackID = state.onConfigAdded(addModel);
        removedCallbackID = state.onConfigRemoved(removeModel);
        activeChangedCallbackID = state.onActiveConfigChanged(changeActiveModel);
    });

    onDestroy(() => {
        state.removeConfigAddedCallback(addedCallbackID);
        state.removeConfigRemovedCallback(removedCallbackID);
        state.removeActiveConfigChangedCallback(activeChangedCallbackID);

        for (const config of state.configs) {
            removeModel(config);
        }

        editor?.dispose();
    });

    $: {
        const model = (editor !== undefined && state.activeConfig !== null) ? getModel(state.activeConfig) : null;
        if (model !== null) {
            monaco.editor.setModelMarkers(model, "owner", [...makeMarkers(errors, state.activeConfig!)]);
        }
    }

    function* makeMarkers(errors: ProblemInfo[], file: string): IterableIterator<Monaco.editor.IMarkerData> {
        for (const e of errors) {
            if (e.location === undefined) {
                console.error(`Unknown location: ${e.message}`);
            }
            else if (e.location.file === file) {
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
