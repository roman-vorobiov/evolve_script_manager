import { describe, it, expect } from "vitest";
import { parseSources as parse, valuesOf, sourceMapsOf } from "./fixture";
import { ParseError } from "$lib/core/dsl/model";

describe("Parser", () => {
    describe("Multiple sources", () => {
        it("should include settings from the target", () => {
            const { nodes, errors, maps } = parse("foo", {
                foo: `
                    use "bar"
                `,
                bar: `
                    hello = 123
                `
            });

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('use "bar"', {
                type: "SettingAssignment",
                setting: maps('use "bar"', { type: "Identifier", value: "hello" }),
                value: maps('use "bar"', { type: "Number", value: 123 })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should include triggers from the target", () => {
            const { nodes, errors, maps } = parse("foo", {
                foo: `
                    use "bar"
                `,
                bar: `
                    when aaa bbb do
                        ccc ddd
                        eee fff
                    end
                `
            });

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('use "bar"', {
                type: "Trigger",
                requirement: maps('use "bar"', {
                    type: maps('use "bar"', { type: "Identifier", value: "aaa" }),
                    id: maps('use "bar"', { type: "Identifier", value: "bbb" }),
                }),
                actions: [
                    maps('use "bar"', {
                        type: maps('use "bar"', { type: "Identifier", value: "ccc" }),
                        id: maps('use "bar"', { type: "Identifier", value: "ddd" }),
                    }),
                    maps('use "bar"', {
                        type: maps('use "bar"', { type: "Identifier", value: "eee" }),
                        id: maps('use "bar"', { type: "Identifier", value: "fff" }),
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should include definitions from the target", () => {
            const { nodes, errors, maps } = parse("foo", {
                foo: `
                    use "bar"
                `,
                bar: `
                    def foo(aaa, bbb) begin
                        hello = $a
                        bye = $b
                    end
                `
            });

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('use "bar"', {
                type: "StatementDefinition",
                name: maps('use "bar"', { type: "Identifier", value: "foo" }),
                params: [
                    maps('use "bar"', { type: "Identifier", value: "aaa" }),
                    maps('use "bar"', { type: "Identifier", value: "bbb" })
                ],
                body: [
                    maps('use "bar"', {
                        type: "SettingAssignment",
                        setting: maps('use "bar"', { type: "Identifier", value: "hello" }),
                        value: maps('use "bar"', { type: "Identifier", value: "$a" })
                    }),
                    maps('use "bar"', {
                        type: "SettingAssignment",
                        setting: maps('use "bar"', { type: "Identifier", value: "bye" }),
                        value: maps('use "bar"', { type: "Identifier", value: "$b" })
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should throw on unknown sources", () => {
            const { nodes, errors, locationBetween } = parse("foo", {
                foo: `
                    use \x01"bar"\x02
                `
            });

            expect(nodes).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0]).toBeInstanceOf(ParseError);
            if (errors[0] instanceof ParseError) {
                expect(errors[0].message).toEqual("Could not find config 'bar'");
                expect(errors[0].location).toEqual(locationBetween(1, 2));
            }
        });

        it("should throw on recursion", () => {
            const { nodes, errors, locationBetween } = parse("foo", {
                foo: `
                    \x01use "foo"\x02
                `
            });

            expect(nodes).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0]).toBeInstanceOf(ParseError);
            if (errors[0] instanceof ParseError) {
                expect(errors[0].message).toEqual("Circular dependency detected");
                expect(errors[0].location).toEqual(locationBetween(1, 2));
            }
        });

        it("should throw on circular dependency", () => {
            const { nodes, errors, locationBetween } = parse("foo", {
                foo: `
                    \x01use "bar"\x02
                `,
                bar: `
                    use "baz"
                `,
                baz: `
                    use "foo"
                `
            });

            expect(nodes).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0]).toBeInstanceOf(ParseError);
            if (errors[0] instanceof ParseError) {
                expect(errors[0].message).toEqual("Circular dependency detected");
                expect(errors[0].location).toEqual(locationBetween(1, 2));
            }
        });
    });
});
