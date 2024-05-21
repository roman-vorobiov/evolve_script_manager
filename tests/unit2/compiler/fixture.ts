import { SourceMap } from "$lib/core/dsl2/parser/source";
import { ExpressionVisitor } from "$lib/core/dsl2/compiler/utils";
import { flattenObject, invertMap } from "$lib/core/utils"

import type { Initial as Parser } from "$lib/core/dsl2/model";

class MockSourceMap extends SourceMap {
    private originsMap: WeakMap<WeakKey, any>;
    private objectToUriMap: WeakMap<WeakKey, string>;

    constructor(objectToUriMap: WeakMap<WeakKey, string>) {
        super();

        this.originsMap = new WeakMap();
        this.objectToUriMap = objectToUriMap;
    }

    override deriveLocation<T extends object, T2 extends object>(original: T, object: T2) {
        super.deriveLocation(original, object);

        const parent = this.originsMap.get(original) ?? original;

        this.originsMap.set(object, parent);

        (object as any).$origin = this.objectToUriMap.get(parent);
    }
}

function fromFactory(objectToUriMap: WeakMap<WeakKey, string>) {
    return function<T1 extends object, T2 extends object>(original: T1, overrides: T2): T1 | T2 {
        if ((overrides as any).type === undefined) {
            return { ...original, ...overrides, $origin: objectToUriMap.get(original) };
        }
        else {
            return { ...overrides, $origin: objectToUriMap.get(original) };
        }
    }
}

export function processExpression(node: Parser.Expression, factory: (sm: SourceMap) => ExpressionVisitor) {
    const objectToUriMap = invertMap(flattenObject(node));
    const sourceMap = new MockSourceMap(objectToUriMap);
    const processor = factory(sourceMap);

    const result = processor.visit(node);

    return { node: result, from: fromFactory(objectToUriMap) };
}

export function processStatement<T1 extends object, T2>(node: T1, processor: (s: T1[], sm: SourceMap) => T2) {
    const objectToUriMap = invertMap(flattenObject(node));
    const sourceMap = new MockSourceMap(objectToUriMap);

    const results = processor([node], sourceMap);
    if (results !== undefined) {
        return { nodes: results, from: fromFactory(objectToUriMap) };
    }
}

export { getExcepion, valuesOf, decoratorsOf as originsOf } from "../fixture";
