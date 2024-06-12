import * as Parser from "$lib/core/dsl/parser/parser";

import type { Position, SourceLocation } from "$lib/core/dsl/parser/source";

type ParserFn = (model: Record<string, string>, target: string) => Parser.ParseResult;

function parse(model: Record<string, string>, target: string, impl: ParserFn) {
    const MAX_POSITION_LITERALS = 20;

    const positions: { [key: number]: Position } = {};

    const lines = model[target].split("\n");

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

    model[target] = lines.join("\n");

    const { sourceMap, nodes, errors } = impl(model, target);

    nodes.forEach(decorateWithSourceMap);

    function decorateWithSourceMap(obj: any) {
        const location = sourceMap.findLocation(obj);
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
            if (location.start.line === location.stop.line) {
                return lines[location.start.line - 1].slice(location.start.column - 1, location.stop.column - 1);
            }
            else {
                let sourceLines: string[] = [];

                sourceLines.push(lines[location.start.line - 1].slice(location.start.column - 1));
                for (let i = location.start.line; i != location.stop.line - 1; ++i) {
                    sourceLines.push(lines[i]);
                }
                sourceLines.push(lines[location.stop.line - 1].slice(0, location.stop.column - 1));

                return sourceLines.join("\n");
            }
        }
    }

    function between(startIdx: number, stopIdx: number): SourceLocation {
        return {
            start: positions[startIdx],
            stop: positions[stopIdx]
        }
    }

    function maps<T extends object>(from: string | [number, number], to: T): T {
        (to as any).$source = Array.isArray(from) ? sourceOf(between(...from)) : from;
        return to;
    }

    maps.identifier = (value: string) => {
        return maps(value, { type: "Identifier", value });
    }

    return { nodes, errors, maps, locationBetween: between }
}

export function parseSources(target: string, model: Record<string, string>) {
    return parse(model, target, Parser.parseSource);
}

export function parseSource(source: string) {
    return parseSources("source", { source });
}

export function parseExpression(source: string) {
    return parse({ source }, "source", (m, t) => Parser.parseExpression(m[t]));
}

export { valuesOf, decoratorsOf as sourceMapsOf } from "../fixture";
