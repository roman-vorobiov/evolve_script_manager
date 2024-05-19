import type { Modify } from "$lib/core/utils/typeUtils";
import type { SourceMap } from "../parser/source";

export function deriveLocation<T1 extends object, T2 extends object>(sourceMap: SourceMap, original: T1, node: T2): T2 {
    sourceMap.deriveLocation(original, node);
    return node;
}

export function derived<T1 extends object, T2 extends object>(sourceMap: SourceMap, original: T1, overrides: T2): Modify<T1, T2> {
    return deriveLocation(sourceMap, original, { ...original, ...overrides });
}

export abstract class BasePostProcessor {
    constructor(private sourceMap: SourceMap) {}

    deriveLocation<T1 extends object, T2 extends object>(original: T1, node: T2): T2 {
        return deriveLocation(this.sourceMap, original, node);
    }

    derived<T1 extends object, T2 extends object>(original: T1, overrides: T2): Modify<T1, T2> {
        return derived(this.sourceMap, original, overrides);
    }

    abstract processExpression(expression: unknown): unknown;
}
