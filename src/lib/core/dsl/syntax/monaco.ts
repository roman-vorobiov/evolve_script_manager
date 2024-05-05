import { CharStream } from "antlr4ng";
import { DSLLexer } from "$lib/core/dsl/parser/.antlr/DSLLexer";
import { isCapitalized } from "$lib/core/utils/stringUtils";

import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

const keywords = new Set([
    "When",
    "Do",
    "If",
    "Then",
    "End",
    "AND",
    "OR",
    "NOT"
]);

class DSLToken implements Monaco.languages.IToken {
    scopes: string;
    startIndex: number;

    constructor(tokenName: string, startIndex: number, tokenText?: string, previousToken?: string) {
        this.scopes = this.ruleName(tokenName, tokenText, previousToken)
        this.startIndex = startIndex;
    }

    private ruleName(tokenName: string, tokenText?: string, previousToken?: string) {
        if (tokenName === "ON" || tokenName === "OFF") {
            return "attribute.value.dsl";
        }
        else if (keywords.has(tokenName)) {
            return "keyword.dsl";
        }
        else if (tokenName === "Identifier") {
            if (previousToken === "Assignment") {
                return "attribute.value.dsl";
            }
            else {
                return isCapitalized(tokenText!) ? "type.dsl" : "variable.dsl";
            }
        }
        else {
            return tokenName.toLowerCase() + ".dsl";
        }
    }
}

class DSLLineTokens implements Monaco.languages.ILineTokens {
    endState: Monaco.languages.IState;
    tokens: Monaco.languages.IToken[];

    constructor(tokens: Monaco.languages.IToken[]) {
        this.endState = new DSLState();
        this.tokens = tokens;
    }
}

class DSLState implements Monaco.languages.IState {
    clone(): Monaco.languages.IState {
        return new DSLState();
    }

    equals(other: Monaco.languages.IState) {
        return true;
    }
}

class DSLTokenProvider implements Monaco.languages.TokensProvider {
    getInitialState() {
        return new DSLState();
    }

    tokenize(line: string, state: Monaco.languages.IState) {
        const EOF = -1;

        const chars = CharStream.fromString(line);
        const lexer = new DSLLexer(chars);
        lexer.removeErrorListeners();

        let tokens: Monaco.languages.IToken[] = [];
        let previousToken: string | undefined;
        while (true) {
            let token = lexer.nextToken();
            if (token === null || token.type === EOF) {
                break;
            }

            const tokenName = lexer.symbolicNames[token.type];
            if (tokenName !== null) {
                tokens.push(new DSLToken(tokenName, token.column, token.text, previousToken));
                previousToken = tokenName;
            }
        }

        return new DSLLineTokens(tokens);
    }
}

export function initializeSyntax(monaco: typeof Monaco) {
    monaco.languages.register({ id: "DSL" });

    monaco.languages.setTokensProvider("DSL", new DSLTokenProvider());

    monaco.languages.setLanguageConfiguration("DSL", {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        autoClosingPairs: [
            { open: "(", close: ")" }
        ],
        comments: {
            lineComment: "#"
        }
    });
}
