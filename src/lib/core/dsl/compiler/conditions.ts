import { StatementVisitor, isConstant } from "./utils";

import type { CompileError } from "../model";
import type { SourceMap } from "../parser/source";
import type * as Before from "../model/8";
import type * as After from "../model/9";

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

export function toEvalExpression(expression: Before.Expression): After.EvalLiteral {
    return {
        type: "Eval",
        value: toEvalString(expression)
    };
}

export function toSimpleExpression(expression: Before.Expression): After.SimpleExpression {
    if (expression.type === "Expression") {
        return {
            type: "Eval",
            value: toEvalString(expression)
        };
    }
    else {
        return expression;
    }
}

export class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const conditionStrategy = isConstant(statement.value) ? "toFlat" : "toSimple";
        const condition = statement.condition && this[conditionStrategy](statement.condition);
        const value = this.toSimple(statement.value);

        return this.derived(statement, { value, condition });
    }

    private toFlat(expression: Before.Expression): After.Expression {
        if (expression.type === "Expression") {
            const args = expression.args.map(arg => this.toSimple(arg));

            return this.derived(expression, { args });
        }
        else {
            return expression;
        }
    }

    private toSimple(expression: Before.Expression): After.SimpleExpression {
        if (expression.type === "Expression") {
            return this.deriveLocation(expression, toSimpleExpression(expression));
        }
        else {
            return expression;
        }
    }
}

export function flattenExpressions(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
