import { describe, it, expect } from "vitest";
import { parse as parseImpl } from "$lib/core/dsl/parser";

import type { Position, SourceLocation } from "$lib/core/dsl/parser/model";

type NodeParseExpectation = { from?: SourceLocation, into?: any }

expect.extend({
    toBeParsed(received: any, expected: NodeParseExpectation) {
        const actual: NodeParseExpectation = {};

        if (expected.from !== undefined) {
            actual.from = received.location;
        }

        if (expected.into !== undefined) {
            actual.into = received.valueOf();
        }

        return {
            pass: this.equals(actual, expected),
            message: () => "Parser node failed comparison",
            expected,
            actual
        };
    }
});

function parse(rawSource: string) {
    const MAX_POSITION_LITERALS = 9;

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

    return { locations, ...parseImpl(lines.join("\n")) };
}

describe("Parser", () => {
    describe("Statement separation", () => {
        it("should split on newline", () => {
            const { nodes, errors, locations } = parse(`
                \x01{foo} = ON\x02
                \x03{bar} = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0]).toBeParsed({ from: locations.between(1, 2) });
            expect(nodes[1]).toBeParsed({ from: locations.between(3, 4) });
        });

        it("should split on newlines", () => {
            const { nodes, errors, locations } = parse(`
                \x01{foo} = ON\x02


                \x03{bar} = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0]).toBeParsed({ from: locations.between(1, 2) });
            expect(nodes[1]).toBeParsed({ from: locations.between(3, 4) });
        });

        it("should split on semicolon", () => {
            const { nodes, errors, locations } = parse(`
                \x01{foo} = ON\x02;\x03{bar} = OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(2);

            expect(nodes[0]).toBeParsed({ from: locations.between(1, 2) });
            expect(nodes[1]).toBeParsed({ from: locations.between(3, 4) });
        });
    });

    describe("String value", () => {
        it("should parse an unqoted literal", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x03bar\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: "bar", from: locations.between(3, 4) });
        });
    });

    describe("Numeric value", () => {
        it("should parse a positive integer value", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x03123\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: 123, from: locations.between(3, 4) });
        });

        it("should parse a negative integer value", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x03-1\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: -1, from: locations.between(3, 4) });
        });

        it("should parse a positive float value", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x031.23\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: 1.23, from: locations.between(3, 4) });
        });

        it("should parse a negative float value", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x03-1.23\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: -1.23, from: locations.between(3, 4) });
        });
    });

    describe("Boolean value", () => {
        it("should parse a truthy value", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x03ON\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: true, from: locations.between(3, 4) });
        });

        it("should parse a falsy value", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02} = \x03OFF\x04
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].value).toBeParsed({ into: false, from: locations.between(3, 4) });
        });
    });

    describe("Compound setting names", () => {
        it("should parse prefix + suffix", () => {
            const { nodes, errors, locations } = parse(`
                {\x01foo\x02:\x03bar\x04} = \x05baz\x06
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            expect(nodes[0].type).toBe("SettingAssignment");
            expect(nodes[0].setting.expression!.name).toBeParsed({ into: "foo", from: locations.between(1, 2) });
            expect(nodes[0].setting.expression!.argument).toBeParsed({ into: "bar", from: locations.between(3, 4) });
            expect(nodes[0].value).toBeParsed({ into: "baz", from: locations.between(5, 6) });
        });
    });
});
