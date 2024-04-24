import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

export function initializeSyntax(monaco: typeof Monaco) {
    monaco.languages.register({ id: "DSL" });

    monaco.languages.setLanguageConfiguration("DSL", {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    });

    monaco.languages.setMonarchTokensProvider("DSL", {
        defaultToken: "invalid",

        brackets: [
            { open: "{", close: "}", token: "delimiter.curly" },
            { open: "[", close: "]", token: "delimiter.square" },
            { open: "(", close: ")", token: "delimiter.parenthesis" },
        ],

        keywords: ["def", "var"],

        operators: ["=", "!=", ">", ">=", "<", "<=", "is", "not", "and", "or"],

        symbols: /[=!><]/,

        tokenizer: {
            root: [
                [/[ \t\r\n]+/, "whitespace"],
                [/[{}()\[\]]/, "@brackets"],
                [/[a-zA-Z][\w]*/, {
                    cases: {
                        "@keywords": "keyword",
                        "@operators": "operator",
                        "@default": "identifier"
                    }
                }],
                [/@symbols/, {
                    cases: {
                        "@operators": "operator",
                        "@default": ""
                    }
                }],
                [/[:,;]/, "delimiter"],
                [/#.*/, "comment"],
            ]
        }
    });
}
