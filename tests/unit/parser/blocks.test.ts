import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Blocks", () => {
        it("should collect statements into block body", () => {
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
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "ConditionBlock",
                condition: maps.identifier("aaa"),
                body: [
                    maps([3, 4], {
                        type: "ConditionBlock",
                        condition: maps.identifier("bbb"),
                        body: [
                            maps("foo = 123", {
                                type: "SettingAssignment",
                                setting: maps.identifier("foo"),
                                value: maps("123", { type: "Number", value: 123 })
                            })
                        ]
                    }),
                    maps("bar = 456", {
                        type: "SettingAssignment",
                        setting: maps.identifier("bar"),
                        value: maps("456", { type: "Number", value: 456 })
                    }),
                    maps([5, 6], {
                        type: "ConditionBlock",
                        condition: maps.identifier("ccc"),
                        body: []
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
