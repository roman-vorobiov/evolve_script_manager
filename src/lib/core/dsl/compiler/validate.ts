import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { ParseError } from "../parser/model";
import { isBinaryExpression, isUnaryExpression, isIdentifier } from "./utils";

import type { SourceLocation, SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";

export function checkType(type: string | null, expected: string | null, location: SourceLocation) {
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
            return settingType(node.targets[0].valueOf())!;
        }

        return info.type;
    }
}

function validateEvaluatedExpression(node: SourceTracked<Parser.EvaluatedExpression>): string | null {
    if (node.operator.valueOf() === "A?B") {
        const lType = validateExpression(node.args[0]);
        const rType = validateExpression(node.args[1]);
        checkType(lType, "boolean", node.args[0].location);
        return rType;
    }
    else if (["==", "!="].indexOf(node.operator.valueOf()) !== -1) {
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

export function validateExpression(node: SourceTracked<Parser.Expression>): string | null {
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
