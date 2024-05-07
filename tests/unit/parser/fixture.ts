import { parse as parseImpl } from "$lib/core/dsl/parser/parse";
import { withLocation } from "$lib/core/dsl/parser/utils";

import type { SourceTrackedType } from "$lib/core/dsl/parser/utils";
import type { Position, SourceLocation, SourceTracked } from "$lib/core/dsl/parser/source";

export function parse(rawSource: string) {
    const MAX_POSITION_LITERALS = 20;

    const positions: { [key: number]: Position } = {};

    const lines = rawSource.split("\n");

    for (let [lineIdx, line] of lines.entries()) {
        for (let i = 1; i <= MAX_POSITION_LITERALS; ++i) {
            const character = String.fromCharCode(i);
            const column = line.indexOf(character);
            if (column !== -1) {
                line = line.replace(character, "");
                positions[i] = { line: lineIdx + 1, column: column + 1 };
            }
        }

        lines[lineIdx] = line;
    }

    const locations = {
        between(startIdx: number, stopIdx: number): SourceLocation {
            return {
                start: positions[startIdx],
                stop: positions[stopIdx]
            }
        }
    };

    const mapCache: any = {};
    function maps<T>(from: string | [number, number], to?: T): SourceTrackedType<T> {
        if (to === undefined) {
            return (typeof from === "string") ? maps(from, from) : (undefined as any);
        }

        if (Array.isArray(from)) {
            return withLocation(locations.between(...from), to);
        }

        let location = mapCache[from];

        if (location === undefined) {
            let start: Position | null = null;
            let stop: Position | null = null;

            for (let [lineIdx, line] of lines.entries()) {
                const idx = line.indexOf(from);
                if (idx !== -1) {
                    start = { line: lineIdx + 1, column: idx + 1 };
                    stop = { line: lineIdx + 1, column: idx + 1 + from.length };
                    break;
                }
            }

            if (start !== null && stop !== null) {
                location = {start, stop};
                mapCache[from] = location;
            }
        }

        if (location !== undefined) {
            return withLocation(location, to);
        }

        return undefined as any;
    }

    function at(startIdx: number, stopIdx: number) {
        return function(value: any) {
            return withLocation(locations.between(startIdx, stopIdx), value);
        }
    }

    return { locations, at, maps, ...parseImpl(lines.join("\n")) };
}
