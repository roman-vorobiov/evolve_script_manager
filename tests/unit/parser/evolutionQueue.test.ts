import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Evolution queue", () => {
        it("should parse empty evolution queue declarations", () => {
            const { nodes, errors, maps } = parse(`
                \x01evolutionQueue << begin
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "SettingShiftBlock",
                setting: maps.identifier("evolutionQueue"),
                body: []
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse non-empty evolution queue declarations", () => {
            const { nodes, errors, maps } = parse(`
                \x01evolutionQueue << begin
                    foo = 123
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "SettingShiftBlock",
                setting: maps.identifier("evolutionQueue"),
                body: [
                    maps("foo = 123", {
                        type: "SettingAssignment",
                        setting: maps.identifier("foo"),
                        value: maps("123", { type: "Number", value: 123 })
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
