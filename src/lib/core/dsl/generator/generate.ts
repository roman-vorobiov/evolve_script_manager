import type * as Compiler from "$lib/core/dsl/compiler/model";
import type { Config } from "$lib/core/domain/model";
import type { GenerationResult } from "./model";

function fillConfig(config: Config, statement: Compiler.Statement) {
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

export function generateConfig(statements: Compiler.Statement[]): GenerationResult {
    const config: Config = { triggers: [] };
    for (let statement of statements) {
        fillConfig(config, statement);
    }

    return { config, errors: [] };
}
