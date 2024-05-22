import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { ParseError } from "../model";
import { ExpressionVisitor, StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/5";
import type * as After from "../model/6";

export class AliasResolver extends ExpressionVisitor {
    visitSubscript(expression: Before.Subscript): After.Subscript {
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

    onIdentifier(expression: Before.Identifier): After.Subscript {
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

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    private visitor: AliasResolver;

    constructor(sourceMap: SourceMap) {
        super(sourceMap);
        this.visitor = new AliasResolver(sourceMap);
    }

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | undefined {
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        if (value !== statement.value || condition !== statement.condition) {
            return this.derived(statement, { value, condition }) as After.SettingAssignment;
        }
    }

    onConditionPush(statement: Before.ConditionPush): After.ConditionPush | undefined {
        const condition = this.visitor.visit(statement.condition);

        if (condition !== statement.condition) {
            return this.derived(statement, { condition }) as After.ConditionPush;
        }
    }
}

export function resolveAliases(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
