import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Triggers", () => {
        it("should parse triggers with no count", () => {
            const { nodes, errors, maps } = parse(`aaa bbb`);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("aaa bbb", {
                type: "Trigger",
                actions: [maps("aaa bbb", { type: maps.identifier("aaa"), id: maps.identifier("bbb") })]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse triggers with a count", () => {
            const { nodes, errors, maps } = parse(`aaa bbb`);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("aaa bbb", {
                type: "Trigger",
                actions: [maps("aaa bbb", { type: maps.identifier("aaa"), id: maps.identifier("bbb") })]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse inline triggers with count", () => {
            const { nodes, errors, maps } = parse("aaa bbb (123)");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("aaa bbb (123)", {
                type: "Trigger",
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

        it("should parse trigger chains", () => {
            const { nodes, errors, maps } = parse(`
                aaa bbb then ccc ddd (123) then eee fff
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("aaa bbb then ccc ddd (123) then eee fff", {
                type: "Trigger",
                actions: [
                    maps("aaa bbb", {
                        type: maps.identifier("aaa"),
                        id: maps.identifier("bbb")
                    }),
                    maps("ccc ddd (123)", {
                        type: maps.identifier("ccc"),
                        id: maps.identifier("ddd"),
                        count: maps("123", { type: "Number", value: 123 })
                    }),
                    maps("eee fff", {
                        type: maps.identifier("eee"),
                        id: maps.identifier("fff")
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
