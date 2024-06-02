import { prefixes } from "$lib/core/domain/settings";
import { StatementVisitor, isConstant } from "./utils";
import { assert } from "$lib/core/utils/typeUtils";

import type { CompileError } from "../model";
import type { SourceMap } from "../parser/source";
import type { QueueItem } from "./evolutionQueue";
import type * as Before from "../model/9";
import type * as After from "../model/10";

function convertSimpleExpression(expression: Before.SimpleExpression, idx: 1 | 2) {
    if (expression.type === "Subscript") {
        return {
            [`type${idx}`]: expression.base.value,
            [`arg${idx}`]: expression.key.value
        }
    }
    else {
        return {
            [`type${idx}`]: expression.type,
            [`arg${idx}`]: expression.value
        }
    }
}

function convertBinaryExpression(expression: Before.Expression) {
    if (expression.type === "Expression") {
        if (expression.operator === "not") {
            return {
                ...convertSimpleExpression(expression.args[0], 1),
                cmp: "==",
                ...convertSimpleExpression({ type: "Boolean", value: false }, 2),
            }
        }
        else {
            return {
                ...convertSimpleExpression(expression.args[0], 1),
                cmp: expression.operator.toUpperCase(),
                ...convertSimpleExpression(expression.args[1], 2),
            }
        }
    }
    else {
        return {
            ...convertSimpleExpression(expression, 1),
            cmp: "==",
            ...convertSimpleExpression({ type: "Boolean", value: true }, 2),
        }
    }
}

function convertEvolutionQueueChallenges(challenges: string[]) {
    function makeObject(challenges: string[], enabled: boolean) {
        return Object.fromEntries(challenges.map(challenge => [prefixes.Challenge.prefix + challenge, enabled]));
    }

    return {
        ...makeObject(prefixes.Challenge.allowedSuffixes, false),
        ...makeObject(challenges, true)
    }
}

function convertEvolutionQueueItem(item: QueueItem) {
    return {
        userEvolutionTarget: item.targetRace,
        prestigeType: item.resetType,
        ...convertEvolutionQueueChallenges(item.challenges)
    };
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    private triggerIdx = 0;

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | After.Override {
        if (!isConstant(statement.value)) {
            const condition = <Before.SimpleExpression> statement.condition ?? { type: "Boolean", value: true };

            return this.deriveLocation(statement, <After.Override> {
                type: "Override",
                setting: statement.setting.value,
                value: {
                    ...convertSimpleExpression(condition, 1),
                    cmp: "A?B",
                    ...convertSimpleExpression(statement.value, 2),
                    ret: null
                }
            });
        }
        else if (statement.condition !== undefined) {
            return this.deriveLocation(statement, <After.Override> {
                type: "Override",
                setting: statement.setting.value,
                value: {
                    ...convertBinaryExpression(statement.condition),
                    ret: statement.value.value
                }
            });
        }
        else if (statement.setting.value === "researchIgnore") {
            assert<string>(statement.value.value);

            return this.deriveLocation(statement, {
                type: "SettingAssignment",
                setting: statement.setting.value,
                value: statement.value.value.split(",")
            });
        }
        else {
            return this.deriveLocation(statement, {
                type: "SettingAssignment",
                setting: statement.setting.value,
                value: statement.value.value
            });
        }
    }

    onSettingPush(statement: Before.SettingPush): After.SettingAssignment {
        return {
            type: "SettingAssignment",
            setting: statement.setting.value,
            value: statement.values.map(value => convertEvolutionQueueItem(value as QueueItem))
        };
    }

    onTrigger(statement: Before.Trigger): After.Trigger {
        const triggerIdx = this.triggerIdx++;

        return this.deriveLocation(statement, {
            type: "Trigger",
            value: {
                seq: triggerIdx,
                priority: triggerIdx,
                requirementType: statement.condition.type.value.toLowerCase(),
                requirementId: statement.condition.id.value,
                requirementCount: statement.condition.count.value,
                actionType: statement.action.type.value.toLowerCase(),
                actionId: statement.action.id.value,
                actionCount: statement.action.count.value,
                complete: false
            }
        });
    }
};

export function normalizeStatements(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
