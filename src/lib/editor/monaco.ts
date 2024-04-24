import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import loader from "@monaco-editor/loader";
import { initializeSyntax } from "$lib/core/dsl/syntax/monaco";

let instance: typeof Monaco;

export async function loadMonaco() {
    if (instance === undefined) {
        const monacoEditor = await import("monaco-editor");

        loader.config({ monaco: monacoEditor.default });
        instance = await loader.init();

        initializeSyntax(instance);
    }

    return instance;
}

export type { Monaco };
