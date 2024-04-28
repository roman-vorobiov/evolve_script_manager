import { normalize } from "./normalize";

import type * as Parser from "$lib/core/dsl/parser/model";
import type { Config } from "$lib/core/domain/model";
import type { Statement, CompilationResult } from "./model";

function fillConfig(config: any, statement: Statement) {
    if (statement.type === "SettingAssignment") {
        config[statement.setting] = statement.value;
    }
    else if (statement.type === "Trigger") {
        const idx = config.triggers.length;

        config.triggers.push({
            seq: idx,
            priority: idx,
            requirementType: statement.conditionType,
            requirementId: statement.conditionId,
            requirementCount: statement.conditionCount,
            actionType: statement.actionType,
            actionId: statement.actionId,
            actionCount: statement.actionCount,
            complete: false
        });
    }
}

export function compile(nodes: Parser.Node[]): CompilationResult {
    const { statements, errors } = normalize(nodes);
    if (errors.length !== 0) {
        return { config: {}, errors };
    }

    const config: Config = { triggers: [] };
    for (let statement of statements) {
        fillConfig(config, statement);
    }

    return { config, errors: [] };
}
