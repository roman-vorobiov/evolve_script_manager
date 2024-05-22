import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Triggers", () => {
        it("should parse inline triggers", () => {
            const { nodes, errors, maps } = parse("aaa bbb when ccc ddd");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("aaa bbb when ccc ddd", {
                type: "Trigger",
                condition: maps("ccc ddd", { type: maps.identifier("ccc"), id: maps.identifier("ddd") }),
                actions: [maps("aaa bbb", { type: maps.identifier("aaa"), id: maps.identifier("bbb") })]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse inline triggers with count", () => {
            const { nodes, errors, maps } = parse("aaa bbb (123) when ccc ddd (456)");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("aaa bbb (123) when ccc ddd (456)", {
                type: "Trigger",
                condition: maps("ccc ddd (456)", {
                    type: maps.identifier("ccc"),
                    id: maps.identifier("ddd"),
                    count: maps("456", { type: "Number", value: 456 })
                }),
                actions: [
                    maps("aaa bbb (123)", {
                        type: maps.identifier("aaa"),
                        id: maps.identifier("bbb"),
                        count: maps("123", { type: "Number", value: 123 })
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse block triggers", () => {
            const { nodes, errors, maps } = parse(`
                \x01when aaa bbb do
                    ccc ddd
                    eee fff
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "Trigger",
                condition: maps("aaa bbb", { type: maps.identifier("aaa"), id: maps.identifier("bbb") }),
                actions: [
                    maps("ccc ddd", { type: maps.identifier("ccc"), id: maps.identifier("ddd") }),
                    maps("eee fff", { type: maps.identifier("eee"), id: maps.identifier("fff") })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
