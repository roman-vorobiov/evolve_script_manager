import { expressions } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { assert } from "$lib/core/utils/typeUtils";
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

function resolveIdentifier(node: SourceTracked<Parser.Identifier>, context?: SourceTracked<String>): SourceTracked<Parser.Identifier> {
    if (node.placeholder?.valueOf()) {
        if (context === undefined) {
            throw new ParseError("Placeholder used without the context to resolve it", node.placeholder.location);
        }

        return withLocation(node.location, <Parser.Identifier> {
            name: node.name,
            targets: [withLocation(node.placeholder.location, context.valueOf())]
        });
    }
    else if (node.wildcard?.valueOf()) {
        throw new ParseError("Wildcards are not allowed in conditions", node.wildcard.location);
    }
    else {
        return node;
    }
}

function unpackIdentifier(node: SourceTracked<Parser.Identifier>): SourceTracked<Parser.Identifier>[] {
    return node.targets.map(target => withLocation(node.location, <Parser.Identifier> {
        name: node.name,
        targets: [target]
    }));
}

function unwrapBinaryExpression(node: SourceTracked<Parser.EvaluatedExpression>, context: SourceTracked<String> | undefined): SourceTracked<Parser.Expression | FoldExpression> {
    const l = unwrapExpression(node.args[0], context);
    const r = unwrapExpression(node.args[1], context);

    if (!isFoldExpression(l) && !isFoldExpression(r)) {
        return withLocation(node.location, <Parser.EvaluatedExpression> {
            operator: node.operator,
            args: [l, r]
        });
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

function unwrapUnaryExpression(node: SourceTracked<Parser.EvaluatedExpression>, context: SourceTracked<String> | undefined): SourceTracked<Parser.Expression> {
    const subexpression = unwrapExpression(node.args[0], context);

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

function unwrapIdentifier(node: SourceTracked<Parser.Identifier>, context: SourceTracked<String> | undefined): SourceTracked<Parser.Expression | FoldExpression> {
    if (node.targets.length < 2) {
        return resolveIdentifier(node, context);
    }
    else {
        const operator = node.disjunction?.valueOf() ? "or" : "and";

        if (getCommonType(node) === "boolean") {
            return foldLeft(withLocation(node.location, operator), ...unpackIdentifier(node));
        }
        else {
            return withLocation(node.location, {
                operator,
                expressions: unpackIdentifier(node)
            });
        }
    }
}

export function unwrapExpression(node: SourceTracked<Parser.Expression>, context?: SourceTracked<String>): SourceTracked<Parser.Expression | FoldExpression> {
    if (isBinaryExpression(node)) {
        return unwrapBinaryExpression(node, context);
    }
    else if (isUnaryExpression(node)) {
        return unwrapUnaryExpression(node, context);
    }
    else if (isIdentifier(node)) {
        return unwrapIdentifier(node, context);
    }
    else {
        return node;
    }
}

export function normalizeExpression(node: SourceTracked<Parser.Expression>, context?: SourceTracked<String>): SourceTracked<Parser.Expression> {
    const expression = unwrapExpression(node, context);

    if (isFoldExpression(expression)) {
        throw new ParseError("Fold expression detected outside of a boolean expression", expression.location);
    }

    return expression;
}

export function makeConditionalAssignmentNode(
    valueNode: SourceTracked<Parser.Expression>,
    conditionNode: SourceTracked<Parser.Expression> | undefined,
    context?: SourceTracked<String>
): SourceTracked<Parser.Expression> {
    valueNode = normalizeExpression(valueNode, context);

    if (conditionNode !== undefined) {
        conditionNode = normalizeExpression(conditionNode, context);

        return withLocation(valueNode.location, {
            operator: withLocation(valueNode.location, "A?B"),
            args: [conditionNode, valueNode]
        })
    }
    else {
        return valueNode;
    }
}
