import { describe, it, expect } from "vitest";
import { parseSource as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Settings", () => {
        it("should parse assignment to constants", () => {
            const { nodes, errors, maps } = parse("foo = 123");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("foo = 123", {
                type: "SettingAssignment",
                setting: maps.identifier("foo"),
                value: maps("123", { type: "Number", value: 123 })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse assignment to constants (conditional)", () => {
            const { nodes, errors, maps } = parse("foo = 123 if aaa");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("foo = 123 if aaa", {
                type: "SettingAssignment",
                setting: maps.identifier("foo"),
                value: maps("123", { type: "Number", value: 123 }),
                condition: maps.identifier("aaa")
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse assignment to expressions", () => {
            const { nodes, errors, maps } = parse("foo = bar + baz");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("foo = bar + baz", {
                type: "SettingAssignment",
                setting: maps.identifier("foo"),
                value: maps("bar + baz", {
                    type: "Expression",
                    operator: "+",
                    args: [
                        maps.identifier("bar"),
                        maps.identifier("baz")
                    ]
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse assignment to expressions (conditional)", () => {
            const { nodes, errors, maps } = parse("foo = bar + baz if aaa");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("foo = bar + baz if aaa", {
                type: "SettingAssignment",
                setting: maps.identifier("foo"),
                value: maps("bar + baz", {
                    type: "Expression",
                    operator: "+",
                    args: [
                        maps.identifier("bar"),
                        maps.identifier("baz")
                    ]
                }),
                condition: maps.identifier("aaa")
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse assigned subscripts", () => {
            const { nodes, errors, maps } = parse("foo.bar = 123");

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps("foo.bar = 123", {
                type: "SettingAssignment",
                setting: maps("foo.bar", {
                    type: "Subscript",
                    base: maps.identifier("foo"),
                    key: maps.identifier("bar")
                }),
                value: maps("123", { type: "Number", value: 123 })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse shift of a string", () => {
            const { nodes, errors, maps } = parse('foo << "123"');

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('foo << "123"', {
                type: "SettingShift",
                operator: "<<",
                setting: maps.identifier("foo"),
                values: [
                    maps('"123"', { type: "String", value: "123" })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse shift of an identifier", () => {
            const { nodes, errors, maps } = parse('foo >> bar');

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('foo >> bar', {
                type: "SettingShift",
                operator: ">>",
                setting: maps.identifier("foo"),
                values: [
                    maps('bar', { type: "Identifier", value: "bar" })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });

        it("should parse shift of a list", () => {
            const { nodes, errors, maps } = parse('foo << [bar, "baz"]');

            expect(errors).toStrictEqual([]);
            expect(nodes.length).toBe(1);

            const expectedNode = maps('foo << [bar, "baz"]', {
                type: "SettingShift",
                operator: "<<",
                setting: maps.identifier("foo"),
                values: [
                    maps('bar', { type: "Identifier", value: "bar" }),
                    maps('"baz"', { type: "String", value: "baz" })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
        });
    });
});
