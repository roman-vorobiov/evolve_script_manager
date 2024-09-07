import { StatementVisitor, isConstant } from "./utils";

import type { CompileError } from "../model";
import type { SourceMap } from "../parser/source";
import type * as Before from "../model/10";
import type * as After from "../model/11";

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

function convertCompoundExpression(expression: Before.Expression) {
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
                    ...convertCompoundExpression(statement.condition),
                    ret: statement.value.value
                }
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
            value: statement.values
        };
    }

    onTrigger(statement: Before.Trigger): After.Trigger {
        const triggerIdx = this.triggerIdx++;

        return this.deriveLocation(statement, {
            type: "Trigger",
            value: {
                seq: triggerIdx,
                priority: triggerIdx,
                requirementType: statement.requirement.type.value,
                requirementId: statement.requirement.id.value,
                requirementCount: statement.requirement.count.value,
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
