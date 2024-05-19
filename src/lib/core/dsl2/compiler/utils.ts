import type { Modify } from "$lib/core/utils/typeUtils";
import type { SourceMap } from "../parser/source";

export abstract class BasePostProcessor<BeforeT, AfterT> {
    constructor(private sourceMap: SourceMap) {}

    deriveLocation<T1 extends object, T2 extends object>(original: T1, node: T2): T2 {
        this.sourceMap.deriveLocation(original, node);
        return node;
    }

    derived<T1 extends object, T2 extends object>(original: T1, overrides: T2): Modify<T1, T2> {
        return this.deriveLocation(original, { ...original, ...overrides });
    }

    abstract processExpression(expression: BeforeT): AfterT;
}
