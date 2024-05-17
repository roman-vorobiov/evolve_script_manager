import { resolveWildcards as resolveWildcardsImpl } from "$lib/core/dsl2/compiler/wildcard";
import { SourceMap } from "$lib/core/dsl2/parser/source";
import { flattenObject, invertMap } from "$lib/core/utils"

import type * as Parser from "$lib/core/dsl2/model";

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

        this.originsMap.set(object, original);

        (object as any).$origin = this.objectToUriMap.get(original);
    }
}

export function resolveWildcards(node: Parser.Statement) {
    const objectToUriMap = invertMap(flattenObject(node));

    const sourceMap = new MockSourceMap(objectToUriMap);
    const [result] = resolveWildcardsImpl([node], sourceMap);

    function from<T1 extends object, T2 extends object>(original: T1, overrides: T2): T1 & T2 {
        return { ...original, ...overrides, $origin: objectToUriMap.get(original) };
    }

    return { node: result, from };
}

export { valuesOf, decoratorsOf as originsOf } from "../fixture";
