import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Blocks", () => {
        it("should push and pop conditions", () => {
            const { nodes, errors, maps } = parse(`
                \x01if aaa then
                    \x03if bbb then
                        foo = 123
                    end\x04

                    bar = 456

                    \x05if ccc then
                    end\x06
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(8);

            {
                const expectedNode = maps([1, 2], { type: "ConditionPush", condition: maps.identifier("aaa") });
                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps([3, 4], { type: "ConditionPush", condition: maps.identifier("bbb") });
                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[1])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps("foo = 123", {
                    type: "SettingAssignment",
                    setting: maps.identifier("foo"),
                    value: maps("123", { type: "Number", value: 123 })
                });
                expect(valuesOf(nodes[2])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[2])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps([3, 4], { type: "ConditionPop" });
                expect(valuesOf(nodes[3])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[3])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps("bar = 456", {
                    type: "SettingAssignment",
                    setting: maps.identifier("bar"),
                    value: maps("456", { type: "Number", value: 456 })
                });
                expect(valuesOf(nodes[4])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[4])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps([5, 6], { type: "ConditionPush", condition: maps.identifier("ccc") });
                expect(valuesOf(nodes[5])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[5])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps([5, 6], { type: "ConditionPop" });
                expect(valuesOf(nodes[6])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[6])).toEqual(sourceMapsOf(expectedNode));
            }
            {
                const expectedNode = maps([1, 2], { type: "ConditionPop" });
                expect(valuesOf(nodes[7])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[7])).toEqual(sourceMapsOf(expectedNode));
            }
        });
    });
});
