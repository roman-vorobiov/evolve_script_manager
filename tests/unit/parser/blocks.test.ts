import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Blocks", () => {
        it("should parse empty blocks", () => {
            const { nodes, errors, maps } = parse(`
                \x01if aaa then
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "ConditionBlock",
                condition: maps.identifier("aaa"),
                body: []
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse setting assignments inside the body", () => {
            const { nodes, errors, maps } = parse(`
                \x01if aaa then
                    foo = 123
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "ConditionBlock",
                condition: maps.identifier("aaa"),
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

        it("should parse nested if blocks", () => {
            const { nodes, errors, maps } = parse(`
                \x01if aaa then
                    \x03if bbb then
                    end\x04
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "ConditionBlock",
                condition: maps.identifier("aaa"),
                body: [
                    maps([3, 4], {
                        type: "ConditionBlock",
                        condition: maps.identifier("bbb"),
                        body: []
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse triggers", () => {
            const { nodes, errors, maps } = parse(`
                \x01if aaa then
                    \x03foo bbb when bar ccc\x04
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "ConditionBlock",
                condition: maps.identifier("aaa"),
                body: [
                    maps([3, 4], {
                        type: "Trigger",
                        requirement: maps("bar ccc", { type: maps.identifier("bar"), id: maps.identifier("ccc") }),
                        actions: [maps("foo bbb", { type: maps.identifier("foo"), id: maps.identifier("bbb") })]
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse nested trigger blocks", () => {
            const { nodes, errors, maps } = parse(`
                \x01if aaa then
                    \x03when bar ccc do
                        foo bbb
                    end\x04
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "ConditionBlock",
                condition: maps.identifier("aaa"),
                body: [
                    maps([3, 4], {
                        type: "Trigger",
                        requirement: maps("bar ccc", { type: maps.identifier("bar"), id: maps.identifier("ccc") }),
                        actions: [maps("foo bbb", { type: maps.identifier("foo"), id: maps.identifier("bbb") })]
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
