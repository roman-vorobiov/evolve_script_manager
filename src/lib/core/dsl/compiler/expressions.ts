import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { ParseError } from "../parser/model";

import type { SourceLocation, SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function identity<T>(value: T): T {
    return value;
}

function isBinaryExpression(node: Parser.Expression): node is Parser.EvaluatedExpression {
    return (node as any).operator !== undefined && (node as any).operator != "not";
}

function isUnaryExpression(node: Parser.Expression): node is Parser.EvaluatedExpression {
    return (node as any).operator == "not";
}

function isIdentifier(node: Parser.Expression): node is Parser.Identifier {
    return (node as any).name !== undefined;
}

function checkType(type: string | null, expected: string | null, location: SourceLocation) {
    if (type == null || expected === null) {
        return;
    }

    if (type !== expected) {
        throw new ParseError(`Expected ${expected}, got ${type}`, location);
    }
}

function validateIdentifier(node: SourceTracked<Parser.Identifier>): string | null {
    if (node.targets.length === 0) {
        const info = otherExpressions[node.name.valueOf()];
        if (info === undefined) {
            throw new ParseError(`Unknown expression '${node.name}'`, node.location);
        }

        return info.type;
    }
    else {
        const info = expressions[node.name.valueOf()];
        if (info === undefined) {
            throw new ParseError(`Unknown expression type '${node.name}'`, node.name.location);
        }

        const allowedValues = expressions[node.name.valueOf()].allowedValues;
        if (allowedValues !== null) {
            if (allowedValues.indexOf(node.targets[0].valueOf()) === -1) {
                throw new ParseError(`Unknown ${info.valueDescription} '${node.targets[0]}'`, node.targets[0].location);
            }
        }

        if (info.valueDescription === "setting") {
            return settingType(node.targets[0].valueOf());
        }

        return info.type;
    }
}

function validateEvaluatedExpression(node: SourceTracked<Parser.EvaluatedExpression>): string | null {
    if (["==", "!="].indexOf(node.operator.valueOf()) !== -1) {
        const lType = validateExpression(node.args[0]);
        const rType = validateExpression(node.args[1]);
        checkType(rType, lType, node.args[1].location);
        return "boolean";
    }
    else if (["and", "or", "not"].indexOf(node.operator.valueOf()) !== -1) {
        node.args.forEach(arg => checkType(validateExpression(arg), "boolean", arg.location));
        return "boolean";
    }
    else if (["<", "<=", ">", ">="].indexOf(node.operator.valueOf()) !== -1) {
        node.args.forEach(arg => checkType(validateExpression(arg), "number", arg.location));
        return "boolean";
    }
    else if (["+", "-", "*", "/"].indexOf(node.operator.valueOf()) !== -1) {
        node.args.forEach(arg => checkType(validateExpression(arg), "number", arg.location));
        return "number";
    }
    else {
        throw new ParseError(`Unknown operator '${node.operator}'`, node.operator.location);
    }
}

function validateExpression(node: SourceTracked<Parser.Expression>): string | null {
    if (isBinaryExpression(node) || isUnaryExpression(node)) {
        return validateEvaluatedExpression(node);
    }
    else if (isIdentifier(node)) {
        return validateIdentifier(node);
    }
    else {
        return typeof node.valueOf();
    }
}

export function toEvalString(node: Parser.Expression, wrap: boolean = false): string {
    if (isBinaryExpression(node)) {
        const wrapper = wrap ? (value: string) => `(${value})` : identity;
        return wrapper(`${toEvalString(node.args[0], true)} ${node.operator} ${toEvalString(node.args[1], true)}`);
    }
    else if (isUnaryExpression(node)) {
        return `!${toEvalString(node.args[0], true)}`;
    }
    else if (isIdentifier(node)) {
        const normalized = makeExpressionArgument(node);
        return `checkTypes.${normalized.type}.fn("${normalized.value}")`;
    }
    else {
        return node instanceof String ? `"${node}"` : `${node}`
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
            op: node.operator.toUpperCase(),
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

export function compileCondition(node: SourceTracked<Parser.Expression>): Compiler.OverrideCondition {
    const type = validateExpression(node);
    checkType(type, "boolean", node.location);

    return makeOverrideCondition(node);
}
