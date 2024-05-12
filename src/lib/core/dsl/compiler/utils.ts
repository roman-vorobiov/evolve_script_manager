import { withLocation } from "../parser/utils";

import type { Expression, EvaluatedExpression, Identifier, Constant } from "../parser/model";
import type { SourceTracked } from "../parser/source";

type ExpressionOpt = SourceTracked<Expression> | undefined;

export function combine(op: SourceTracked<String>, l: ExpressionOpt, r: ExpressionOpt): Expression | undefined {
    if (l === undefined) {
        return r;
    }

    if (r === undefined) {
        return l;
    }

    return {
        operator: op,
        args: [l, r]
    };
}

export function conjunction(l: ExpressionOpt, r: ExpressionOpt): Expression | undefined {
    const location = r?.location ?? l?.location;
    if (location !== undefined) {
        return combine(withLocation(location, "and"), l, r);
    }
}

export function disjunction(l: ExpressionOpt, r: ExpressionOpt): Expression | undefined {
    const location = r?.location ?? l?.location;
    if (location !== undefined) {
        return combine(withLocation(location, "or"), l, r);
    }
}

export function foldLeft(operator: SourceTracked<String>, ...args: SourceTracked<Expression>[]): SourceTracked<Expression> {
    return args.reduce((l, r) => withLocation(operator.location, combine(operator, l, r)!));
}

export function isBinaryExpression(node: Expression): node is EvaluatedExpression {
    return (node as any).operator !== undefined && (node as any).operator != "not";
}

export function isUnaryExpression(node: Expression): node is EvaluatedExpression {
    return (node as any).operator == "not";
}

export function isIdentifier(node: Expression): node is Identifier {
    return (node as any).name !== undefined;
}

export function isConstantExpression(node: Expression): node is Constant {
    return node instanceof Boolean || node instanceof Number || node instanceof String;
}
