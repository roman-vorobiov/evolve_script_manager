import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/5";
import type * as After from "../model/6";

export class AliasResolver extends BasePostProcessor {
    override processExpression(expression: Before.Expression): After.Expression {
        if (expression.type === "Identifier") {
            return this.processIdentifier(expression);
        }
        else if (expression.type === "Subscript") {
            return this.processSubscript(expression);
        }
        else if (expression.type === "Expression") {
            const newArgs = expression.args.map(arg => this.processExpression(arg));

            if (newArgs.some((arg, i) => arg !== expression.args[i])) {
                return this.derived(expression, { args: newArgs });
            }
        }

        return expression as After.Expression;
    }

    private processSubscript(expression: Before.Subscript): After.Subscript {
        const info = expressions[expression.base.value];
        if (info === undefined) {
            throw new ParseError("Unknown identifier", expression.base);
        }

        if (info.alias !== undefined) {
            const realName = info.alias(expression.key.value);

            if (realName !== expression.key.value) {
                return this.derived(expression, {
                    key: this.derived(expression.key, { value: realName })
                });
            }
        }

        return expression;
    }

    private processIdentifier(expression: Before.Identifier): After.Subscript {
        if (expression.value in otherExpressions) {
            return this.deriveLocation(expression, {
                type: "Subscript",
                base: this.derived(expression, { value: "Other" }),
                key: this.derived(expression, { value: otherExpressions[expression.value].aliasFor })
            });
        }

        throw new ParseError(`Unexpected identifier '${expression.value}'`, expression);
    }
}

export function resolveAliases(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new AliasResolver(sourceMap);

    function processSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const newValue = impl.processExpression(statement.value);
        const newCondition = statement.condition && impl.processExpression(statement.condition);

        if (newValue !== statement.value || newCondition !== statement.condition) {
            return impl.derived(statement, {
                value: newValue,
                condition: newCondition
            });
        }
        else {
            return statement as After.SettingAssignment;
        }
    }

    function processConditionPush(statement: Before.ConditionPush): After.ConditionPush {
        const newCondition = impl.processExpression(statement.condition);

        if (newCondition !== statement.condition) {
            return impl.derived(statement, { condition: newCondition });
        }
        else {
            return statement as After.ConditionPush;
        }
    }

    function processStatement(statement: Before.Statement): After.Statement {
        if (statement.type === "SettingAssignment") {
            return processSettingAssignment(statement);
        }
        else if (statement.type === "ConditionPush") {
            return processConditionPush(statement);
        }

        return statement;
    }

    return statements.map(processStatement);
}
