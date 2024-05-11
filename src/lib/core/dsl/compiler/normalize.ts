import { expressions } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { ParseError } from "../parser/model";
import { isBinaryExpression, isUnaryExpression, isIdentifier, combine, foldLeft } from "./utils";
import { withLocation } from "../parser/utils";

import type { SourceLocation, SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";

type FoldExpression = {
    operator: "and" | "or",
    expressions: SourceTracked<Parser.Expression>[]
}

function isFoldExpression(value: any): value is FoldExpression {
    return value.expressions !== undefined;
}

function isArithmetic(operator: string) {
    return ["+", "-", "*", "/"].indexOf(operator) !== -1;
}

function assert<T>(value: any): asserts value is T {}

function applyToFold(
    operator: SourceTracked<String>,
    l: SourceTracked<Parser.Expression | FoldExpression>,
    r: SourceTracked<Parser.Expression | FoldExpression>,
    location: SourceLocation
): SourceTracked<FoldExpression> {
    if (isFoldExpression(l)) {
        assert<Parser.Expression>(r);

        return withLocation(l.location, {
            operator: l.operator,
            expressions: l.expressions.map(expr => withLocation(location, combine(operator, expr, r)!))
        });
    }
    else {
        assert<Parser.Expression>(l);
        assert<FoldExpression>(r);

        return withLocation(r.location, {
            operator: r.operator,
            expressions: r.expressions.map(expr => withLocation(location, combine(operator, l, expr)!))
        });
    }
}

function unwrapIdentifier(node: SourceTracked<Parser.Identifier>): SourceTracked<Parser.Identifier>[] {
    return node.targets.map(target => withLocation(node.location, <Parser.Identifier> {
        name: node.name,
        targets: [target]
    }));
}

function unwrapBinaryExpression(node: SourceTracked<Parser.EvaluatedExpression>): SourceTracked<Parser.Expression | FoldExpression> {
    const l = unwrapExpression(node.args[0]);
    const r = unwrapExpression(node.args[1]);

    if (!isFoldExpression(l) && !isFoldExpression(r)) {
        return node;
    }

    if (isFoldExpression(l) && isFoldExpression(r)) {
        throw new ParseError("Only one fold subexpression is allowed", r.location);
    }

    const fold = applyToFold(node.operator, l, r, node.location);

    if (isArithmetic(node.operator.valueOf())) {
        return fold;
    }
    else {
        return foldLeft(withLocation(node.location, fold.operator), ...fold.expressions);
    }
}

function unwrapUnaryExpression(node: SourceTracked<Parser.EvaluatedExpression>): SourceTracked<Parser.Expression> {
    const subexpression = unwrapExpression(node.args[0]);

    if (isFoldExpression(subexpression)) {
        return withLocation(node.location, {
            operator: node.operator,
            args: [
                foldLeft(withLocation(node.location, subexpression.operator), ...subexpression.expressions)
            ]
        });
    }
    else {
        return node;
    }
}

function getCommonType(node: SourceTracked<Parser.Identifier>): string | undefined {
    const info = expressions[node.name.valueOf()];

    if (info.type !== null) {
        return info.type;
    }

    if (info.valueDescription === "setting") {
        const types = [...new Set(node.targets.map(settingId => settingType(settingId.valueOf())))];
        if (types.length !== 1) {
            throw new ParseError("All values of a fold expression must have the same type", node.location);
        }

        return types[0];
    }
}

export function unwrapExpression(node: SourceTracked<Parser.Expression>): SourceTracked<Parser.Expression | FoldExpression> {
    if (isBinaryExpression(node)) {
        return unwrapBinaryExpression(node);
    }
    else if (isUnaryExpression(node)) {
        return unwrapUnaryExpression(node);
    }
    else if (isIdentifier(node)) {
        if (node.targets.length < 2) {
            return node;
        }
        else {
            const operator = node.disjunction?.valueOf() ? "or" : "and";

            if (getCommonType(node) === "boolean") {
                return foldLeft(withLocation(node.location, operator), ...unwrapIdentifier(node));
            }
            else {
                return withLocation(node.location, {
                    operator,
                    expressions: unwrapIdentifier(node)
                });
            }
        }
    }
    else {
        return node;
    }
}

export function normalizeExpression(node: SourceTracked<Parser.Expression>): SourceTracked<Parser.Expression> {
    const expression = unwrapExpression(node);

    if (isFoldExpression(expression)) {
        throw new ParseError("Fold expression detected outside of a boolean expression", expression.location);
    }

    return expression;
}
