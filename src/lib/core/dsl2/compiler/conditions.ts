import { StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/7";
import type * as After from "../model/8";

function isConstant(expression: Before.Expression): expression is Before.Constant {
    return expression.type === "Boolean" || expression.type === "Number" || expression.type === "String";
}

function identity<T>(value: T): T {
    return value;
}

const operatorMap = <any> {
    and: "&&",
    or: "||",
    not: "!"
};

export function toEvalString(expression: Before.Expression, wrap: boolean = false): string {
    const wrapper = wrap ? (value: string) => `(${value})` : identity;

    if (expression.type === "Expression") {
        if (expression.operator === "not") {
            return `!${toEvalString(expression.args[0], true)}`;
        }
        else {
            const operator = operatorMap[expression.operator] ?? expression.operator;
            const left = toEvalString(expression.args[0], true);
            const right = toEvalString(expression.args[1], true);

            return wrapper(`${left} ${operator} ${right}`);
        }
    }
    else if (expression.type === "Subscript") {
        return `_('${expression.base.value}', '${expression.key.value}')`;
    }
    else if (expression.type === "Eval") {
        return wrapper(expression.value);
    }
    else if (expression.type === "String") {
        return `'${expression.value}'`;
    }
    else {
        return `${expression.value}`;
    }
}

export class Impl extends StatementVisitor {
    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | undefined {
        const conditionStrategy = isConstant(statement.value) ? "toFlat" : "toSimple";
        const condition = statement.condition && this[conditionStrategy](statement.condition);
        const value = this.toSimple(statement.value);

        if (value !== statement.value || condition !== statement.condition) {
            return this.derived(statement, { value, condition });
        }
    }

    private toFlat(expression: Before.Expression): After.Expression {
        if (expression.type === "Expression") {
            const args = expression.args.map(arg => this.toSimple(arg));

            if (this.differentLists(args, expression.args)) {
                return this.derived(expression, { args });
            }
        }

        return expression as After.Expression;
    }

    private toSimple(expression: Before.Expression): After.SimpleExpression {
        if (expression.type === "Expression") {
            return this.deriveLocation(expression, {
                type: "Eval",
                value: toEvalString(expression)
            });
        }
        else {
            return expression;
        }
    }
}

export function flattenExpressions(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements) as After.Statement[];
}
