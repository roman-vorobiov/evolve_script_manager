import { ParserRuleContext, Token } from "antlr4ng";

export type Position = {
    line: number,
    column: number
}

export type SourceLocation = {
    file: string,
    start: Position,
    stop: Position
}

function samePosition(l: Position, r: Position) {
    return l.line === r.line && l.column === r.column;
}

export function sameLocation(l: SourceLocation, r: SourceLocation) {
    return l.file === r.file && samePosition(l.start, r.start) && samePosition(l.stop, r.stop);
}

function contextLocation(ctx: ParserRuleContext, file: string): SourceLocation {
    return {
        file,
        start: tokenLocation(ctx.start!, file).start,
        stop: tokenLocation(ctx.stop!, file).stop
    };
}

function tokenLocation(token: Token, file: string): SourceLocation {
    const length = token.text!.length;

    return {
        file,
        start: { line: token.line, column: token.column + 1 },
        stop: { line: token.line, column: token.column + 1 + length }
    };
}

export type SourceEntity = ParserRuleContext | Token | SourceLocation;

export function locationOf(sourceEntity: SourceEntity, file: string): SourceLocation {
    if (sourceEntity instanceof ParserRuleContext) {
        return contextLocation(sourceEntity, file);
    }
    else if ((sourceEntity as any).tokenIndex !== undefined) {
        return tokenLocation(sourceEntity as Token, file);
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
    private importStacks = new WeakMap<WeakKey, SourceLocation[]>();

    public importStack: SourceLocation[] = [];

    findLocation<T extends object>(object: T): SourceLocation | undefined {
        return this.locations.get(object);
    }

    getImportStack<T extends object>(object: T): SourceLocation[] {
        return this.importStacks.get(object) ?? [];
    }

    addLocation<T extends object>(object: T, sourceEntity: SourceEntity, file: string) {
        this.locations.set(object, locationOf(sourceEntity, file));

        if (this.importStack.length !== 0) {
            this.importStacks.set(object, this.importStack);
        }
    }

    deriveLocation<T extends object, T2 extends object>(original: T, object: T2) {
        const location = this.findLocation(original);
        if (location !== undefined) {
            this.locations.set(object, location);
        }

        const importStack = this.importStacks.get(original);
        if (importStack !== undefined) {
            this.importStacks.set(object, importStack);
        }
    }
}
