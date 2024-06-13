import loader from "@monaco-editor/loader";

import { CodeCompletionProvider } from "./codeCompletion";
import { initializeSyntax } from "./syntax";

import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { State } from "$lib/core/state";

let instance: typeof Monaco;

export async function loadMonaco(state: State) {
    if (instance === undefined) {
        const monacoEditor = await import("monaco-editor");

        loader.config({ monaco: monacoEditor.default });
        instance = await loader.init();

        instance.languages.register({ id: "DSL" });

        instance.languages.registerCompletionItemProvider("DSL", new CodeCompletionProvider(state));

        initializeSyntax(instance);
    }

    return instance;
}

export type { Monaco };
