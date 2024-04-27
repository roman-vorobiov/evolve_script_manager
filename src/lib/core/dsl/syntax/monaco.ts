import { CharStream } from "antlr4ng";
import { DSLLexer } from "$lib/core/dsl/parser/.antlr/DSLLexer";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

class DSLToken implements Monaco.languages.IToken {
    scopes: string;
    startIndex: number;

    constructor(ruleName: String, startIndex: number) {
        this.scopes = ruleName.toLowerCase() + ".dsl";
        this.startIndex = startIndex;
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
        while (true) {
            let token = lexer.nextToken();
            if (token === null || token.type === EOF) {
                break;
            }

            const tokenName = lexer.symbolicNames[token.type];
            if (tokenName !== null) {
                tokens.push(new DSLToken(tokenName!, token.column));
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
        comments: {
            lineComment: "#"
        }
    });
}
