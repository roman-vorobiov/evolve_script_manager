import { ParserModel } from "$lib/core/dsl2/parser/parser";
import { toObject } from "$lib/core/utils";

import type { Position, SourceLocation } from "$lib/core/dsl2/parser/source";

export function parse(source: string) {
    const MAX_POSITION_LITERALS = 20;

    const positions: { [key: number]: Position } = {};

    const lines = source.split("\n");

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

    source = lines.join("\n");

    const parser = new ParserModel();
    parser.update(source);

    parser.nodes.forEach(decorateWithSourceMap);

    function decorateWithSourceMap(obj: any) {
        const location = parser.sourceMap.findLocation(obj);
        if (location !== undefined) {
            obj.$source = sourceOf(location);
        }

        if (Array.isArray(obj)) {
            obj.forEach(decorateWithSourceMap);
        }
        else if (obj instanceof Object) {
            Object.values(obj).forEach(decorateWithSourceMap);
        }
    }

    function sourceOf(location: SourceLocation | undefined) {
        if (location !== undefined) {
            // Assume it's a one-liner
            return lines[location.start.line - 1].slice(location.start.column - 1, location.stop.column - 1);
        }
    }

    function between(startIdx: number, stopIdx: number): SourceLocation {
        return {
            start: positions[startIdx],
            stop: positions[stopIdx]
        }
    }

    function maps(from: string | [number, number], to: any = from) {
        const obj = toObject(to);
        obj.$source = Array.isArray(from) ? sourceOf(between(...from)) : from;
        return obj;
    }

    return {
        nodes: parser.nodes,
        errors: parser.errors,
        maps
    }
}

export function valuesOf(obj: any): any {
    if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) {
        return obj.valueOf();
    }
    else if (Array.isArray(obj)) {
        return obj.map(valuesOf);
    }
    else if (obj instanceof Object) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([key]) => !key.startsWith("$"))
                .map(([key, value]) => [key, valuesOf(value)])
        );
    }
    else {
        return obj;
    }
}

export function sourceMapsOf(obj: any): any {
    if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) {
        return (obj as any).$source;
    }
    else if (Array.isArray(obj)) {
        const childSourceMaps = obj.map(sourceMapsOf);
        if (childSourceMaps.length !== 0) {
            return childSourceMaps;
        }
    }
    else if (obj instanceof Object) {
        return Object.fromEntries(
            Object.entries(obj)
                .map(([key, value]) => [key, key.startsWith("$") ? value : sourceMapsOf(value)])
                .filter(([key, value]) => value !== undefined)
        );
    }
}
