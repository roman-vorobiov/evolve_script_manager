import { CharStream } from "antlr4ng";
import { DSLLexer } from "$lib/core/dsl/parser/.antlr/DSLLexer";
import { isCapitalized } from "$lib/core/utils/stringUtils";

import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

function makeTokenMap(ruleToTokensMap: Record<string, string[]>) {
    return Object.fromEntries(
        Object.entries(ruleToTokensMap)
            .map(([rule, tokens]) => tokens.map(t => [t, rule]))
            .flat()
    );
}

const tokenMap = makeTokenMap({
    "keyword.dsl": [
        "When",
        "Do",
        "If",
        "Then",
        "End",
        "AND",
        "OR",
        "NOT"
    ],
    "string.dsl": [
        "BigEval",
        "SmallEval",
        "OpeningBrace",
        "ClosingBrace"
    ],
    "attribute.value.dsl": [
        "ON",
        "OFF"
    ]
});

function ruleName(tokenName: string, tokenText: string | undefined, state: DSLState): string {
    if (tokenMap[tokenName] !== undefined) {
        return tokenMap[tokenName];
    }
    else if (tokenName === "Identifier") {
        if (state.insideSubscript || !isCapitalized(tokenText!)) {
            return "variable.dsl";
        }
        else {
            return "type.dsl";
        }
    }
    else {
        return tokenName.toLowerCase() + ".dsl";
    }
}

class DSLToken implements Monaco.languages.IToken {
    constructor(public scopes: string, public startIndex: number) {}
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
    constructor(
        public previousToken: string | undefined = undefined,
        public insideEval = false,
        private _insideSubscript = false,
    ) {}

    get insideSubscript() {
        return this._insideSubscript || this.previousToken === "Dot";
    }

    set insideSubscript(value: boolean) {
        this._insideSubscript = value;
    }

    clone(): Monaco.languages.IState {
        return new DSLState(this.previousToken, this.insideEval, this._insideSubscript);
    }

    equals(other: Monaco.languages.IState) {
        return true;
    }
}

class DSLTokenProvider implements Monaco.languages.TokensProvider {
    getInitialState() {
        return new DSLState();
    }

    tokenize(line: string, state: DSLState) {
        const EOF = -1;

        const chars = CharStream.fromString(line);
        const lexer = new DSLLexer(chars);
        lexer.removeErrorListeners();

        let tokens: Monaco.languages.IToken[] = [];
        while (true) {
            let token = lexer.nextToken();
            if (token === null || token.type === EOF) {
                break;
            }

            const tokenName = lexer.symbolicNames[token.type];

            if (state.insideEval) {
                tokens.push(new DSLToken("string.dsl", token.column));
            }
            else if (tokenName !== null) {
                if (tokenName === "OpeningBrace") {
                    state.insideEval = true;
                }
                else if (tokenName === "ClosingBrace") {
                    state.insideEval = false;
                }
                else if (tokenName === "OpeningBracket") {
                    state.insideSubscript = true;
                }
                else if (tokenName === "ClosingBracket") {
                    state.insideSubscript = false;
                }

                tokens.push(new DSLToken(ruleName(tokenName, token.text, state), token.column));
                state.previousToken = tokenName;
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
            { open: '(', close: ')' },
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
        ],
        comments: {
            lineComment: "#"
        }
    });
}
