import { triggerConditions, triggerActions } from "$lib/core/domain/triggers";
import { ParseError } from "../parser/model";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function normalizeTriggerActionId(type: string, id: string): string {
    if (type === "Arpa") {
        return "arpa" + id;
    }
    else {
        return id;
    }
}

function validateTriggerCount(value?: SourceTracked<Number>): number {
    if (value === undefined) {
        return 1;
    }

    if (!Number.isInteger(value.valueOf())) {
        throw new ParseError("Value must be an integer", value.location);
    }

    return value.valueOf();
}

function validateTriggerType(
    key: "condition" | "action",
    types: typeof triggerConditions | typeof triggerActions,
    type: SourceTracked<String>
): string {
    if (types[type.valueOf() as keyof typeof types] === undefined) {
        throw new ParseError(`Unknown trigger ${key} '${type}'`, type.location);
    }

    return type.valueOf();
}

function validateTriggerId(
    type: string,
    types: typeof triggerConditions | typeof triggerActions,
    id: SourceTracked<String>
): string {
    const candidates = types[type as keyof typeof types] as string[];

    if (candidates.indexOf(id.valueOf()) === -1) {
        if (type === "Built" || type === "Build") {
            throw new ParseError(`Unknown building '${id}'`, id.location);
        }
        else {
            throw new ParseError(`Unknown tech '${id}'`, id.location);
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

function compileCondition(condition: Parser.TriggerArgument): Compiler.TriggerArgument {
    const type = validateTriggerConditionType(condition.type);
    const id = validateTriggerConditionId(type, condition.id);
    const count = validateTriggerCount(condition.count);

    return {
        type: type.toLowerCase(),
        id,
        count
    }
}

function compileAction(action: Parser.TriggerArgument): Compiler.TriggerArgument {
    const type = validateTriggerActionType(action.type);
    const id = validateTriggerActionId(type, action.id);
    const count = validateTriggerCount(action.count);

    return {
        type: type.toLowerCase(),
        id,
        count
    }
}

export function *compileTrigger(node: Parser.Trigger): Generator<Compiler.Trigger> {
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
