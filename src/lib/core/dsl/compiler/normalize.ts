import { settingPrefixes, triggerConditions, triggerActions } from "$lib/core/domain";
import defaultSettings from "$lib/assets/default.json";
import { withLocation } from "../parser/utils";

import type * as Parser from "$lib/core/dsl/parser/model";
import type { Statement, SettingAssignment, Trigger } from "./model";

function validateSettingPrefix(settingPrefix: Parser.SourceTracked<String>): string {
    const prefix = settingPrefixes[settingPrefix.valueOf()];

    if (prefix === undefined) {
        throw { message: `Unknown setting prefix '${settingPrefix}'`, location: settingPrefix.location };
    }

    return prefix;
}

function validateSetting(settingName: Parser.SourceTracked<String>): string {
    if (defaultSettings[settingName.valueOf() as keyof typeof defaultSettings] === undefined) {
        throw { message: `Unknown setting '${settingName}'`, location: settingName.location };
    }

    return settingName.valueOf();
}

function validateTriggerType(
    key: "condition" | "action",
    types: typeof triggerConditions | typeof triggerActions,
    t: Parser.SourceTracked<String>
): string {
    if (types[t.valueOf() as keyof typeof types] === undefined) {
        throw { message: `Unknown trigger ${key} '${t}'`, location: t.location };
    }

    return t.valueOf();
}

function validateTriggerId(
    t: string,
    types: typeof triggerConditions | typeof triggerActions,
    id: Parser.SourceTracked<String>
): string {
    const candidates = types[t as keyof typeof types] as string[];

    if (candidates.indexOf(id.valueOf()) === -1) {
        if (t === "Built" || t === "Build") {
            throw { message: `Unknown building '${id}'`, location: id.location };
        }
        else {
            throw { message: `Unknown tech '${id}'`, location: id.location };
        }
    }

    return id.valueOf();
}

function validateTriggerConditionType(conditionType: Parser.SourceTracked<String>): string {
    return validateTriggerType("condition", triggerConditions, conditionType);
}

function validateTriggerActionType(actionType: Parser.SourceTracked<String>): string {
    return validateTriggerType("action", triggerActions, actionType);
}

function validateTriggerConditionId(conditionType: string, conditionId: Parser.SourceTracked<String>): string {
    return validateTriggerId(conditionType, triggerConditions, conditionId);
}

function validateTriggerActionId(actionType: string, actionId: Parser.SourceTracked<String>): string {
    return validateTriggerId(actionType, triggerActions, actionId);
}

function normalizeCompoundSettingName(node: Parser.CallExpression): string {
    const prefix = validateSettingPrefix(node.name);
    return `${prefix}${node.argument.valueOf()}`;
}

function normalizeSettingName(node: Parser.Setting): string {
    if (node.name !== undefined) {
        return validateSetting(node.name);
    }
    else if (node.expression !== undefined) {
        const setting = normalizeCompoundSettingName(node.expression);
        return validateSetting(withLocation(node.expression.argument.location, setting));
    }
    else {
        throw new Error(`Unknown settingId format: ${node}`);
    }
}

function normalizeSettingAssignment(node: Parser.SettingAssignment): SettingAssignment {
    return {
        type: "SettingAssignment",
        setting: normalizeSettingName(node.setting),
        value: node.value.valueOf()
    };
}

function normalizeTrigger(node: Parser.Trigger): Trigger {
    const conditionType = validateTriggerConditionType(node.condition.name);
    const conditionId = validateTriggerConditionId(conditionType, node.condition.argument);
    const actionType = validateTriggerActionType(node.action.name);
    let actionId = validateTriggerActionId(actionType, node.action.argument);

    if (actionType === "Arpa") {
        actionId = "arpa" + actionId;
    }

    return {
        type: "Trigger",
        actionType: actionType.toLowerCase(),
        actionId,
        actionCount: 1,
        conditionType: conditionType.toLowerCase(),
        conditionId,
        conditionCount: 1
    };
}

function *normalizeImpl(nodes: Parser.Node[], errors: Parser.ParseError[]): Generator<Statement> {
    const dispatch = {
        SettingAssignment: normalizeSettingAssignment,
        Trigger: normalizeTrigger
    };

    function isParseError(error: any): error is Parser.ParseError {
        return error.message !== undefined && error.location !== undefined;
    }

    for (let node of nodes) {
        try {
            yield dispatch[node.type](node as any);
        }
        catch (e) {
            if (isParseError(e)) {
                errors.push(e);
            }
            else {
                throw e;
            }
        }
    }
}

export type NormalizationResult = {
    statements: Statement[],
    errors: Parser.ParseError[]
}

export function normalize(nodes: Parser.Node[]): NormalizationResult {
    const errors: Parser.ParseError[] = [];
    const statements = [...normalizeImpl(nodes, errors)];

    return { statements, errors };
}
