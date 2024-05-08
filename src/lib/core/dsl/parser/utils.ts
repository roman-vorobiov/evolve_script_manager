import { ParserRuleContext, Token } from "antlr4ng";

import type { SourceLocation, SourceTracked } from "./source";

function contextLocation(ctx: ParserRuleContext) {
    return {
        start: tokenLocation(ctx.start!).start,
        stop: tokenLocation(ctx.stop!).stop
    };
}

function tokenLocation(token: Token) {
    const length = token.text!.length;

    return {
        start: { line: token.line, column: token.column + 1 },
        stop: { line: token.line, column: token.column + 1 + length }
    };
}

export type SourceEntity = ParserRuleContext | Token | SourceLocation;

export function locationOf(sourceEntity: SourceEntity): SourceLocation {
    if (sourceEntity instanceof ParserRuleContext) {
        return contextLocation(sourceEntity);
    }
    else if ((sourceEntity as any).tokenIndex !== undefined) {
        return tokenLocation(sourceEntity as Token);
    }
    else if ((sourceEntity as any).start !== undefined) {
        return sourceEntity as SourceLocation;
    }
    else {
        throw new Error(`Unknown source entity: ${sourceEntity}`);
    }
}

export type SourceTrackedType<T> = SourceTracked<
    T extends string ? String :
    T extends number ? Number :
    T extends boolean ? Boolean :
    T
>;

export function withLocation<T>(sourceEntity: SourceEntity, value: T): SourceTrackedType<T> {
    const location = locationOf(sourceEntity);

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
