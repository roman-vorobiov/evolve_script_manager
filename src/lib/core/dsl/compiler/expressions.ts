import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { ParseError } from "../parser/model";
import { normalizeExpression } from "./normalize";
import { validateCondition } from "./validate";
import { isBinaryExpression, isUnaryExpression, isIdentifier } from "./utils";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function identity<T>(value: T): T {
    return value;
}

function operatorForEval(operator: string): string {
    const map = <any> {
        and: "&&",
        or: "||",
        not: "!"
    };

    return map[operator] ?? operator;
}

function operatorForCondition(operator: string): string {
    return operator.toUpperCase();
}

export function toEvalString(node: Parser.Expression, wrap: boolean = false): string {
    const wrapper = wrap ? (value: string) => `(${value})` : identity;

    if (isBinaryExpression(node)) {
        const operator = operatorForEval(node.operator.valueOf());
        const left = toEvalString(node.args[0], true);
        const right = toEvalString(node.args[1], true);

        return wrapper(`${left} ${operator} ${right}`);
    }
    else if (isUnaryExpression(node)) {
        return `!${toEvalString(node.args[0], true)}`;
    }
    else if (isIdentifier(node)) {
        const normalized = makeExpressionArgument(node);

        if (normalized.type === "Eval") {
            return wrapper(normalized.value as string);
        }
        else {
            return `_('${normalized.type}', '${normalized.value}')`;
        }
    }
    else {
        return node instanceof String ? `'${node}'` : `${node}`
    }
}

export function makeExpressionArgument(node: Parser.Expression): Compiler.ExpressionArgument {
    if (isBinaryExpression(node) || isUnaryExpression(node)) {
        return {
            type: "Eval",
            value: toEvalString(node)
        }
    }
    else if (isIdentifier(node)) {
        if (node.targets.length === 0) {
            return {
                type: "Other",
                value: otherExpressions[node.name.valueOf()].aliasFor
            };
        }
        else {
            const resolveAlias = expressions[node.name.valueOf()].alias ?? identity;
            return {
                type: node.name.valueOf(),
                value: resolveAlias(node.targets[0].valueOf())
            };
        }
    }
    else {
        return {
            type: node.constructor.name,
            value: node.valueOf()
        }
    }
}

export function makeOverrideCondition(node: SourceTracked<Parser.Expression>): Compiler.OverrideCondition {
    if (isBinaryExpression(node)) {
        return {
            op: operatorForCondition(node.operator.valueOf()),
            left: makeExpressionArgument(node.args[0]),
            right: makeExpressionArgument(node.args[1])
        }
    }
    else if (isUnaryExpression(node)) {
        return {
            op: "==",
            left: makeExpressionArgument(node.args[0]),
            right: { type: "Boolean", value: false }
        }
    }
    else if (isIdentifier(node)) {
        return {
            op: "==",
            left: makeExpressionArgument(node),
            right: { type: "Boolean", value: true }
        }
    }
    else {
        // Todo: evaluate and warn
        throw new ParseError("Unexpected constant expression", node.location);
    }
}

export function compileCondition(node: SourceTracked<Parser.Expression>, context?: SourceTracked<String>): Compiler.OverrideCondition {
    node = normalizeExpression(node, context);

    validateCondition(node);

    return makeOverrideCondition(node);
}
