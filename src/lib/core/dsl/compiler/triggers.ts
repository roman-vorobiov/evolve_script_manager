import { triggerConditions, triggerActions } from "$lib/core/domain";

import type * as Parser from "$lib/core/dsl/parser/model";
import type * as Compiler from "./model";

function normalizeTriggerActionId(t: string, id: string) {
    if (t === "Arpa") {
        return "arpa" + id;
    }
    else {
        return id;
    }
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
    const id = validateTriggerId(actionType, triggerActions, actionId);
    return normalizeTriggerActionId(actionType, id);
}

export function *compileTrigger(node: Parser.Trigger): Generator<Compiler.Trigger> {
    const conditionType = validateTriggerConditionType(node.condition.name);
    const conditionId = validateTriggerConditionId(conditionType, node.condition.argument);
    const actionType = validateTriggerActionType(node.action.name);
    const actionId = validateTriggerActionId(actionType, node.action.argument);

    yield {
        type: "Trigger",
        actionType: actionType.toLowerCase(),
        actionId,
        actionCount: 1,
        conditionType: conditionType.toLowerCase(),
        conditionId,
        conditionCount: 1
    };
}

export function *compileTriggerChain(node: Parser.TriggerChain): Generator<Compiler.Trigger> {
    const conditionType = validateTriggerConditionType(node.condition.name);
    const conditionId = validateTriggerConditionId(conditionType, node.condition.argument);

    let isFirst = true;
    for (let action of node.actions) {
        const actionType = validateTriggerActionType(action.name);
        const actionId = validateTriggerActionId(actionType, action.argument);

        yield {
            type: "Trigger",
            actionType: actionType.toLowerCase(),
            actionId,
            actionCount: 1,
            conditionType: isFirst ? conditionType.toLowerCase() : "chain",
            conditionId: isFirst ? conditionId : "",
            conditionCount: 1
        };

        isFirst = false;
    }
}
