import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Blocks", () => {
        it("should parse expression definitions", () => {
            const { nodes, errors, maps } = parse("def foo = 123 + 456");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("def foo = 123 + 456", {
                type: "ExpressionDefinition",
                name: maps.identifier("foo"),
                body: maps("123 + 456", {
                    type: "Expression",
                    operator: "+",
                    args: [
                        maps("123", { type: "Number", value: 123 }),
                        maps("456", { type: "Number", value: 456 })
                    ]
                }),
                parameterized: false
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse list definitions", () => {
            const { nodes, errors, maps } = parse('def foo = [bar, "baz"]');

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('def foo = [bar, "baz"]', {
                type: "ExpressionDefinition",
                name: maps.identifier("foo"),
                body: maps('[bar, "baz"]', {
                    type: "List",
                    values: [
                        maps('bar', { type: "Identifier", value: "bar" }),
                        maps('"baz"', { type: "String", value: "baz" })
                    ]
                }),
                parameterized: false
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse parameterized expression definitions", () => {
            const { nodes, errors, maps } = parse("def foo[...] = 123 + 456");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("def foo[...] = 123 + 456", {
                type: "ExpressionDefinition",
                name: maps.identifier("foo"),
                body: maps("123 + 456", {
                    type: "Expression",
                    operator: "+",
                    args: [
                        maps("123", { type: "Number", value: 123 }),
                        maps("456", { type: "Number", value: 456 })
                    ]
                }),
                parameterized: true
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
