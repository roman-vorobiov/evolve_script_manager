import { prefixes, settings } from "$lib/core/domain/settings";
import settingEnums from "$lib/core/domain/settingEnums";
import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { triggerActions, triggerConditions } from "$lib/core/domain/triggers";

import * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { State } from "$lib/core/state";

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

function insideImport(tokenStack: string[]) {
    return tokenStack[0] === "use" || tokenStack[1] === "use";
}

function isAssignee(tokenStack: string[]): boolean {
    return tokenStack[0] === "=" || tokenStack[1] === "=";
}

function getCandidates(model: Monaco.editor.ITextModel, position: Monaco.Position, state: State): string[] | Record<string, string> {
    const tokenStack = tokenizeBackwards(model, position);

    const prefix = tryGetPrefix(tokenStack);
    if (prefix !== undefined) {
        const settingInfo = prefixes[prefix];
        const expressionInfo = expressions[prefix];

        if (settingInfo !== undefined && !(expressionInfo !== undefined && insideCondition(tokenStack))) {
            return settingInfo.allowedSuffixes;
        }

        if (expressionInfo !== undefined) {
            let candidates = expressionInfo.allowedValues;
            if (prefix === "SettingCurrent" || prefix === "SettingDefault") {
                return [...Object.keys(prefixes), ...Object.keys(candidates)];
            }
            else {
                return candidates;
            }
        }
    }
    else if (isAssignee(tokenStack)) {
        const enumValues = settingEnums[tokenStack[0]] ?? settingEnums[tokenStack[1]];
        if (enumValues !== undefined) {
            return Object.fromEntries(Object.entries(enumValues).map(([text, label]) => [`"${text}"`, label]));
        }
    }
    else if (insideCondition(tokenStack)) {
        return [...Object.keys(expressions), ...Object.keys(otherExpressions)];
    }
    else if (insideImport(tokenStack)) {
        return Object.fromEntries(state.configs.map(cfg => [cfg.name, cfg.name]));
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

    constructor(private state: State) {}

    provideCompletionItems(model: Monaco.editor.ITextModel, position: Monaco.Position) {
        const candidates = getCandidates(model, position, this.state);

        const currentToken = model.getWordUntilPosition(position);

        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: currentToken.startColumn,
            endColumn: currentToken.endColumn
        };

        if (Array.isArray(candidates)) {
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
        else {
            return <Monaco.languages.CompletionList> {
                incomplete: false,
                suggestions: Object.entries(candidates).map(([text, label]) => ({
                    label,
                    insertText: text,
                    kind: Monaco.languages.CompletionItemKind.Field,
                    range
                }))
            }
        }
    }
}
