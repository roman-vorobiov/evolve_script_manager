import { withLocation } from "$lib/core/dsl/parser/utils";

import type { SourceLocation, SourceTracked } from "$lib/core/dsl/parser/source";
import type { Identifier, TriggerArgument } from "$lib/core/dsl/parser/model";

export function makeDummyLocation(id = 0): SourceLocation {
    return {
        start: { line: 0, column: id },
        stop: { line: 0, column: id },
    };
}

export function withDummyLocation<T>(value: T, id = 0) {
    return withLocation(makeDummyLocation(id), value);
}

export function makeSettingId(
    name: string | SourceTracked<String>,
    suffix?: string | SourceTracked<String>
): SourceTracked<Identifier> {
    if (typeof name === "string") {
        name = withDummyLocation(name);
    }

    if (typeof suffix === "string") {
        suffix = withDummyLocation(suffix);
    }

    const node: Identifier = { name, targets: [] };

    if (suffix !== undefined) {
        node.targets.push(suffix);
    }

    return withDummyLocation(node);
}

export function makeTriggerArgument(
    type: string | SourceTracked<String>,
    id: string | SourceTracked<String>,
    count?: number | SourceTracked<Number>
): SourceTracked<TriggerArgument> {
    if (typeof type === "string") {
        type = withDummyLocation(type);
    }

    if (typeof id === "string") {
        id = withDummyLocation(id);
    }

    if (typeof count === "number") {
        count = withDummyLocation(count);
    }

    return withDummyLocation(<TriggerArgument> { type, id, count });
}
