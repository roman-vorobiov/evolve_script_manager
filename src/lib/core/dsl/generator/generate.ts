import type * as Compiler from "$lib/core/dsl/compiler/model";
import type { Config } from "$lib/core/domain/model";
import type { GenerationResult } from "./model";

function setSetting(config: Config, statement: Compiler.SettingAssignment) {
    config[statement.setting] = statement.value;
}

function addOverride(config: Config, statement: Compiler.Override) {
    const overrides = config.overrides[statement.target] ??= [];

    overrides.push({
        type1: statement.condition.left.type,
        arg1: statement.condition.left.value,
        cmp: statement.condition.op,
        type2: statement.condition.right.type,
        arg2: statement.condition.right.value,
        ret: statement.value
    });
}

function addTrigger(config: Config, statement: Compiler.Trigger) {
    const idx = config.triggers.length;

    config.triggers.push({
        seq: idx,
        priority: idx,
        requirementType: statement.condition.type,
        requirementId: statement.condition.id,
        requirementCount: statement.condition.count,
        actionType: statement.action.type,
        actionId: statement.action.id,
        actionCount: statement.action.count,
        complete: false
    });
}

function fillConfig(config: Config, statement: Compiler.Statement) {
    if (statement.type === "SettingAssignment") {
        setSetting(config, statement);
    }
    else if (statement.type === "Override") {
        addOverride(config, statement);
    }
    else if (statement.type === "Trigger") {
        addTrigger(config, statement);
    }
}

export function generateConfig(statements: Compiler.Statement[]): GenerationResult {
    const config: Config = { overrides: {}, triggers: [] };
    for (let statement of statements) {
        fillConfig(config, statement);
    }

    return { config, errors: [] };
}
