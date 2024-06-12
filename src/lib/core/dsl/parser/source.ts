import { ParserRuleContext, Token } from "antlr4ng";

export type Position = {
    line: number,
    column: number
}

export type SourceLocation = {
    start: Position,
    stop: Position
}

function contextLocation(ctx: ParserRuleContext): SourceLocation {
    return {
        start: tokenLocation(ctx.start!).start,
        stop: tokenLocation(ctx.stop!).stop
    };
}

function tokenLocation(token: Token): SourceLocation {
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

export class SourceMap {
    private locations = new WeakMap<WeakKey, SourceLocation>();

    importLocation: SourceLocation | undefined = undefined;

    findLocation<T extends object>(object: T): SourceLocation | undefined {
        return this.locations.get(object);
    }

    addLocation<T extends object>(object: T, sourceEntity: SourceEntity) {
        if (this.importLocation !== undefined) {
            this.locations.set(object, this.importLocation);
        }
        else {
            this.locations.set(object, locationOf(sourceEntity));
        }
    }

    deriveLocation<T extends object, T2 extends object>(original: T, object: T2) {
        const location = this.findLocation(original);
        if (location !== undefined) {
            this.addLocation(object, location);
        }
    }
}
