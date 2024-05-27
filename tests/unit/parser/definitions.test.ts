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

        it("should parse function definitions", () => {
            const { nodes, errors, maps } = parse(`
                \x01def foo(aaa, bbb) begin
                    hello = $a
                    bye = $b
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "StatementDefinition",
                name: maps.identifier("foo"),
                params: [
                    maps.identifier("aaa"),
                    maps.identifier("bbb")
                ],
                body: [
                    maps('hello = $a', {
                        type: "SettingAssignment",
                        setting: maps.identifier('hello'),
                        value: maps.identifier('$a')
                    }),
                    maps('bye = $b', {
                        type: "SettingAssignment",
                        setting: maps.identifier('bye'),
                        value: maps.identifier('$b')
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse loops", () => {
            const { nodes, errors, maps } = parse(`
                \x01for foo in [aaa, bbb] do
                    $foo = ON
                end\x02
            `);

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "Loop",
                iteratorName: maps.identifier("foo"),
                values: maps("[aaa, bbb]", {
                    type: "List",
                    values: [
                        maps.identifier("aaa"),
                        maps.identifier("bbb")
                    ]
                }),
                body: [
                    maps('$foo = ON', {
                        type: "SettingAssignment",
                        setting: maps.identifier('$foo'),
                        value: maps('ON', { type: "Boolean", value: true })
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
