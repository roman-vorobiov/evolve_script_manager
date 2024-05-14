import { describe, it, expect } from "vitest";
import { parse, valuesOf, sourceMapsOf } from "./fixture";

import type * as Parser from "$lib/core/dsl2/parser/model";

describe("Parser", () => {
    describe("Settings", () => {
        describe("Setting values", () => {
            it.each([
                { source: '"123"', target: "123" },
                { source: "123", target: 123 },
                { source: "-123", target: -123 },
                { source: "1.23", target: 1.23 },
                { source: "-1.23", target: -1.23 },
                { source: "ON", target: true },
                { source: "OFF", target: false },
            ])("should parse constants: $source as $target", ({ source, target }) => {
                const { nodes, errors, maps } = parse(`foo = ${source}`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps(`foo = ${source}`, <Parser.SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps(source, target)
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse identifiers", () => {
                const { nodes, errors, maps } = parse(`foo = bar.baz`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps(`foo = bar.baz`, <Parser.SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar.baz", { name: maps("bar"), targets: [maps("baz")] })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse expression", () => {
                const { nodes, errors, maps } = parse(`foo = bar + baz`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps(`foo = bar + baz`, <Parser.SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar + baz", {
                        operator: maps("+"),
                        args: [
                            maps("bar", { name: maps("bar"), targets: [] }),
                            maps("baz", { name: maps("baz"), targets: [] })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });
        });
    });
});
