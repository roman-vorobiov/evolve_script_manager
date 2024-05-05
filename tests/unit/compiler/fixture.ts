import { withLocation } from "$lib/core/dsl/parser/utils";

import type { SourceLocation } from "$lib/core/dsl/parser/source";

export function makeDummyLocation(id = 0): SourceLocation {
    return {
        start: { line: 0, column: id },
        stop: { line: 0, column: id },
    };
}

export function withDummyLocation<T>(value: T, id = 0) {
    return withLocation(makeDummyLocation(id), value);
}
