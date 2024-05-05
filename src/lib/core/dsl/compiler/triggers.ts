import { triggerConditions, triggerActions } from "$lib/core/domain";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function normalizeTriggerActionId(t: string, id: string): string {
    if (t === "Arpa") {
        return "arpa" + id;
    }
    else {
        return id;
    }
}

function validateTriggerCount(value: SourceTracked<Number> | undefined): number {
    if (value === undefined) {
        return 1;
    }

    if (!Number.isInteger(value.valueOf())) {
        throw { message: "Value must be an integer", location: value.location };
    }

    return value.valueOf();
}

function validateTriggerType(
    key: "condition" | "action",
    types: typeof triggerConditions | typeof triggerActions,
    t: SourceTracked<String>
): string {
    if (types[t.valueOf() as keyof typeof types] === undefined) {
        throw { message: `Unknown trigger ${key} '${t}'`, location: t.location };
    }

    return t.valueOf();
}

function validateTriggerId(
    t: string,
    types: typeof triggerConditions | typeof triggerActions,
    id: SourceTracked<String>
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

function validateTriggerConditionType(conditionType: SourceTracked<String>): string {
    return validateTriggerType("condition", triggerConditions, conditionType);
}

function validateTriggerActionType(actionType: SourceTracked<String>): string {
    return validateTriggerType("action", triggerActions, actionType);
}

function validateTriggerConditionId(conditionType: string, conditionId: SourceTracked<String>): string {
    return validateTriggerId(conditionType, triggerConditions, conditionId);
}

function validateTriggerActionId(actionType: string, actionId: SourceTracked<String>): string {
    const id = validateTriggerId(actionType, triggerActions, actionId);
    return normalizeTriggerActionId(actionType, id);
}

function compileCondition(condition: Parser.CallExpression) {
    const conditionType = validateTriggerConditionType(condition.name);
    const conditionId = validateTriggerConditionId(conditionType, condition.arguments[0] as SourceTracked<String>);
    const conditionCount = validateTriggerCount(condition.arguments[1] as SourceTracked<Number>);

    return {
        type: conditionType.toLowerCase(),
        id: conditionId,
        count: conditionCount
    }
}

function compileAction(action: Parser.CallExpression) {
    const actionType = validateTriggerActionType(action.name);
    const actionId = validateTriggerActionId(actionType, action.arguments[0] as SourceTracked<String>);
    const actionCount = validateTriggerCount(action.arguments[1] as SourceTracked<Number>);

    return {
        type: actionType.toLowerCase(),
        id: actionId,
        count: actionCount
    }
}

export function *compileTrigger(node: Parser.Trigger): Generator<Compiler.Trigger> {
    yield {
        type: "Trigger",
        condition: compileCondition(node.condition),
        action: compileAction(node.action)
    };
}

export function *compileTriggerChain(node: Parser.TriggerChain): Generator<Compiler.Trigger> {
    const condition = compileCondition(node.condition);
    const chainCondition = {
        type: "chain",
        id: "",
        count: 0
    }

    let isFirst = true;
    for (let action of node.actions) {
        yield {
            type: "Trigger",
            condition: (isFirst ? condition : chainCondition),
            action: compileAction(action)
        };

        isFirst = false;
    }
}
