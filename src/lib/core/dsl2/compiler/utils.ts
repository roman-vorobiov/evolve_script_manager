import type { SourceMap } from "../parser/source";
import type * as Parser from "../model";

export abstract class BasePostProcessor {
    constructor(private sourceMap: SourceMap) {}

    deriveLocation<T1 extends object, T2 extends object>(original: T1, node: T2): T2 {
        this.sourceMap.deriveLocation(original, node);
        return node;
    }

    derived<T extends object>(original: T, overrides: Partial<T>): T {
        return this.deriveLocation(original, { ...original, ...overrides });
    }

    abstract processExpression(expression: Parser.Expression): Parser.Expression;
}
