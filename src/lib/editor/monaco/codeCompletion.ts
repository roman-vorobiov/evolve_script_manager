import { prefixes, settings } from "$lib/core/domain/settings";
import { expressions } from "$lib/core/domain/expressions";
import { triggerActions, triggerConditions } from "$lib/core/domain/triggers";

import * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

function tokenizeBackwards(model: Monaco.editor.ITextModel, position: Monaco.Position) {
    const lineContents = model.getLineContent(position.lineNumber);

    function* impl(): IterableIterator<string> {
        while (position.column > 0) {
            const token = model.getWordUntilPosition(position);
            yield token.word;
            if (token.startColumn > 2) {
                yield lineContents.at(token.startColumn - 2)!;
            }
            position = position.with(undefined, token.startColumn).delta(undefined, -1);
        }
    }

    function* filter(it: IterableIterator<string>) {
        for (const token of it) {
            if (token !== "" && token !== " ") {
                yield token;
            }
        }
    }

    return [...filter(impl())];
}

function tryGetPrefix(tokenStack: string[]): string | undefined {
    let allowDot = true;
    let endOfSubscript = false;
    let depth = 0;

    for (const token of tokenStack) {
        if (endOfSubscript) {
            // we're inside a list
            if (token !== "=" && token !== "in") {
                return token;
            }
            break;
        }
        else if (token === "." && allowDot) {
            endOfSubscript = true;
        }
        else if (token === "[") {
            if (depth === 0) {
                endOfSubscript = true;
            }
            --depth;
        }
        else if (token === "]") {
            ++depth;
        }

        allowDot = false;
    }
}

function insideCondition(tokenStack: string[]): boolean {
    return tokenStack.some(token => token === "if");
}

function getCandidates(model: Monaco.editor.ITextModel, position: Monaco.Position): string[] {
    const tokenStack = tokenizeBackwards(model, position);

    const prefix = tryGetPrefix(tokenStack);
    if (prefix !== undefined) {
        const settingInfo = prefixes[prefix];
        if (settingInfo !== undefined) {
            return settingInfo.allowedSuffixes;
        }

        const expressionInfo = expressions[prefix];
        if (expressionInfo !== undefined) {
            let candidates = expressionInfo.allowedValues.filter(Boolean);
            if (prefix === "SettingCurrent" || prefix === "SettingDefault") {
                candidates = [...Object.keys(prefixes), ...candidates];
            }

            return candidates;
        }
    }
    else if (insideCondition(tokenStack)) {
        return Object.keys(expressions);
    }
    else if (tokenStack.length > 1 && tokenStack[1] in triggerActions) {
        return triggerActions[tokenStack[1] as keyof typeof triggerActions].allowedValues;
    }
    else if (tokenStack.length > 1 && tokenStack[1] in triggerConditions) {
        return triggerConditions[tokenStack[1] as keyof typeof triggerConditions].allowedValues;
    }
    else if (tokenStack.length > 0 && tokenStack[0] in triggerActions) {
        return triggerActions[tokenStack[0] as keyof typeof triggerActions].allowedValues;
    }
    else if (tokenStack.length > 0 && tokenStack[0] in triggerConditions) {
        return triggerConditions[tokenStack[0] as keyof typeof triggerConditions].allowedValues;
    }
    else if (tokenStack.length > 0 && (tokenStack[0] === "when" || tokenStack[1] === "when")) {
        return Object.keys(triggerConditions);
    }
    else if (tokenStack.length < 2) {
        return [...Object.keys(prefixes), ...settings, ...Object.keys(triggerActions)];
    }

    return [];
}

export class CodeCompletionProvider implements Monaco.languages.CompletionItemProvider {
    readonly triggerCharacters = [".", "["];

    provideCompletionItems(model: Monaco.editor.ITextModel, position: Monaco.Position) {
        const candidates = getCandidates(model, position);

        const currentToken = model.getWordUntilPosition(position);

        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: currentToken.startColumn,
            endColumn: currentToken.endColumn
        };

        return <Monaco.languages.CompletionList> {
            incomplete: false,
            suggestions: candidates.map(candidate => ({
                label: candidate,
                insertText: candidate,
                kind: Monaco.languages.CompletionItemKind.Field,
                range
            }))
        }
    }
}
