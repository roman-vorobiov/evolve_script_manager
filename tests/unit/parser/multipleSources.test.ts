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

            const expectedNode = maps("hello = 123", {
                type: "SettingAssignment",
                setting: maps.identifier("hello"),
                value: maps("123", { type: "Number", value: 123 })
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
                    \x01aaa bbb then
                    ccc ddd\x02
                `
            });

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps([1, 2], {
                type: "Trigger",
                actions: [
                    maps("aaa bbb", {
                        type: maps.identifier("aaa"),
                        id: maps.identifier("bbb")
                    }),
                    maps("ccc ddd", {
                        type: maps.identifier("ccc"),
                        id: maps.identifier("ddd")
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
                    \x01def foo(aaa, bbb) begin
                        hello = $a
                        bye = $b
                    end\x02
                `
            });

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
                        setting: maps.identifier("hello"),
                        value: maps.identifier("$a")
                    }),
                    maps('bye = $b', {
                        type: "SettingAssignment",
                        setting: maps.identifier("bye"),
                        value: maps.identifier("$b")
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
                expect(errors[0].importStack).toEqual([]);
            }
        });

        it("should throw on circular dependency", () => {
            const { nodes, errors, locationBetween } = parse("foo", {
                foo: `
                    \x05use "bar"\x06
                `,
                bar: `
                    \x03use "baz"\x04
                `,
                baz: `
                    \x01use "foo"\x02
                `
            });

            expect(nodes).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0]).toBeInstanceOf(ParseError);
            if (errors[0] instanceof ParseError) {
                expect(errors[0].message).toEqual("Circular dependency detected");
                expect(errors[0].location).toEqual(locationBetween(1, 2));
                expect(errors[0].importStack).toEqual([
                    locationBetween(5, 6),
                    locationBetween(3, 4)
                ]);
            }
        });
    });
});
