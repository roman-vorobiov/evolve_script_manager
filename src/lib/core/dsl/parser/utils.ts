import { ParserRuleContext, Token } from "antlr4ng";

import type { SourceTracked } from "./model";

export function contextLocation(ctx: ParserRuleContext) {
    return {
        start: {
            line: ctx.start!.line,
            column: ctx.start!.column + 1
        },
        stop: {
            line: ctx.stop!.line,
            column: ctx.stop!.column
        }
    }
}

export function tokenLocation(token: Token) {
    const length = token.stop - token.start;

    return {
        start: { line: token.line, column: token.column + 1 },
        stop: { line: token.line, column: token.column + 2 + length }
    };
}

type SourceEntity = ParserRuleContext | Token;

type SourceTrackedType<T> = SourceTracked<
    T extends string ? String :
    T extends number ? Number :
    T extends boolean ? Boolean :
    T
>;

export function withLocation<T>(sourceEntity: SourceEntity, value: T): SourceTrackedType<T> {
    const location = (() => {
        if (sourceEntity instanceof ParserRuleContext) {
            return contextLocation(sourceEntity);
        }
        else if (sourceEntity.tokenIndex !== undefined) {
            return tokenLocation(sourceEntity);
        }
        else {
            throw new Error(`Unknown source entity: ${sourceEntity}`);
        }
    })();

    const result = (() => {
        if (typeof value === "string") {
            return new String(value);
        }
        else if (typeof value === "number") {
            return new Number(value);
        }
        else if (typeof value === "boolean") {
            return new Boolean(value);
        }
        else if (typeof value === "object") {
            return value as any;
        }
        else {
            throw new Error(`Unknown value: ${value}`);
        }
    })();

    result.location = location;

    return result;
}
