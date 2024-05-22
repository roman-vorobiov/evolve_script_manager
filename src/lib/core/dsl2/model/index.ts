import type { SourceLocation } from "../parser/source";

export type * as Initial from "./1";
export type * as Final from "./10";

export class ParseError extends Error {
    location?: SourceLocation;

    constructor(message: string, location?: SourceLocation) {
        super(message);
        this.location = location;
    }
}

export class CompileError extends Error {
    offendingEntity: any;

    constructor(message: string, offendingEntity: any) {
        super(message);
        this.offendingEntity = offendingEntity;
    }
}
