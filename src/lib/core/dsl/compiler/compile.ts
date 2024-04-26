import { normalize } from "./normalize";

import type * as Parser from "$lib/core/dsl/parser/model";
import type { Statement, CompilationResult } from "./model";

function fillConfig(config: any, statement: Statement) {
    if (statement.type === "SettingAssignment") {
        config[statement.setting] = statement.value;
    }
}

export function compile(nodes: Parser.Node[]): CompilationResult {
    const config = {};
    const errors: Parser.ParseError[] = [];

    const statements = normalize(nodes, errors);
    if (errors.length !== 0) {
        return { config: {}, errors };
    }

    for (let statement of statements) {
        fillConfig(config, statement);
    }

    return { config, errors };
}
