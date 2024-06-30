import type { SourceLocation } from "../parser/source";

export type * as Initial from "./0";
export type * as Final from "./10";

export class ParseError extends Error {
    constructor(
        message: string,
        public location?: SourceLocation,
        public importStack: SourceLocation[] = []
    ) {
        super(message);
    }
}

export class CompileError extends Error {
    constructor(
        message: string,
        public offendingEntity: any,
        public details: [string, any][] = []
    ) {
        super(message);
    }
}

export class CompileWarning {
    constructor(
        public message: string,
        public offendingEntity: any,
        public details: [string, any][] = []
    ) {}
}
