import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { CompileError } from "../model";
import { ExpressionVisitor, StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/5";
import type * as After from "../model/6";

export class AliasResolver extends ExpressionVisitor {
    visitSubscript(expression: Before.Subscript): After.Subscript {
        const info = expressions[expression.base.value];
        if (info === undefined) {
            throw new CompileError("Unknown identifier", expression.base);
        }

        if (info.alias !== undefined) {
            const realName = info.alias(expression.key.value);

            if (realName !== expression.key.value) {
                return this.derived(expression, {
                    key: this.derived(expression.key, { value: realName })
                });
            }
        }

        // allowedValues is only null for Eval which isn't a subscript
        if (!info.allowedValues!.includes(expression.key.value)) {
            throw new CompileError(`'${expression.key.value}' is not a valid ${info.valueDescription}`, expression.key);
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

        throw new CompileError(`Unexpected identifier '${expression.value}'`, expression);
    }
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    private visitor: AliasResolver;

    constructor(sourceMap: SourceMap, errors: CompileError[]) {
        super(sourceMap, errors);
        this.visitor = new AliasResolver(sourceMap);
    }

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        return this.derived(statement, { value, condition }) as After.SettingAssignment;
    }

    onSettingShift(statement: Before.SettingShift): After.SettingShift {
        const condition = statement.condition && this.visitor.visit(statement.condition);

        return this.derived(statement, { condition }) as After.SettingShift;
    }

    onConditionBlock(statement: Before.ConditionBlock, body: After.Statement[]): After.ConditionBlock {
        const condition = this.visitor.visit(statement.condition);

        return this.derived(statement, { condition, body }) as After.ConditionBlock;
    }
}

export function resolveAliases(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
