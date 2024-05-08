import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { ParseError } from "../parser/model";
import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function getExpressionType(node: Parser.Identifier): string | null {
    if (node.targets.length === 0) {
        return otherExpressions[node.name.valueOf()].type;
    }
    else {
        const info = expressions[node.name.valueOf()];
        if (info.valueDescription === "setting") {
            return settingType(node.targets[0].valueOf());
        }
        else {
            return info.type;
        }
    }
}

function validateIdentifier(node: SourceTracked<Parser.Identifier>) {
    if (node.targets.length === 0) {
        if (otherExpressions[node.name.valueOf()] === undefined) {
            throw new ParseError(`Unknown expression '${node.name}'`, node.location);
        }
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
    }
}

function validateIdentifierType(node: SourceTracked<Parser.Identifier>, expectedType: string) {
    const type = getExpressionType(node);
    if (type !== null) {
        if (type !== expectedType) {
            throw new ParseError(`Expected ${expectedType}, got ${type}`, node.location);
        }
    }
}

function isBinaryExpression(node: Parser.Expression): node is Parser.EvaluatedExpression {
    return (node as any).operator !== undefined && (node as any).operator !== "not";
}

function isUnaryExpression(node: Parser.Expression): node is Parser.EvaluatedExpression {
    return (node as any).operator === "not";
}

function isNullaryExpression(node: Parser.Expression): node is Parser.Identifier {
    return (node as any).name !== undefined;
}

function makeBinaryExpression(node: SourceTracked<Parser.Expression>): Compiler.OverrideCondition | undefined {
    if (isBinaryExpression(node)) {
        // Todo
    }
    else if (isUnaryExpression(node)) {
        // Todo
    }
    else if (isNullaryExpression(node)) {
        validateIdentifier(node);
        validateIdentifierType(node, "boolean");

        return {
            op: "==",
            left: {
                type: node.name.valueOf(),
                value: node.targets[0].valueOf()
            },
            right: {
                type: "Boolean",
                value: true
            }
        }
    }
    else {
        // Todo: constant
    }
}

export function *compileCondition(node: SourceTracked<Parser.Expression>): Generator<Compiler.OverrideCondition> {
    const expression = makeBinaryExpression(node);
    if (expression !== undefined) {
        yield expression;
    }
}
