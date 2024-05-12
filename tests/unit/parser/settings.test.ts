import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

import type { SettingAssignment } from "$lib/core/dsl/parser/model";

describe("Parser", () => {
    describe("Settings", () => {
        describe("Simple setting names", () => {
            it.each([
                { source: '"bar"', target: "bar" },
                { source: "123", target: 123 },
                { source: "-123", target: -123 },
                { source: "1.23", target: 1.23 },
                { source: "-1.23", target: -1.23 },
                { source: "ON", target: true },
                { source: "OFF", target: false },
            ])("should parse constant assignments", ({ source, target }) => {
                const { nodes, errors, maps } = parse(`foo = ${source}`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps(`foo = ${source}`, <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps(source, target)
                }));
            });

            it("should parse nullary expression assignments", () => {
                const { nodes, errors, maps } = parse(`foo = bar`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps(`foo = bar`, <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar", { name: maps("bar"), targets: [] })
                }));
            });

            it("should parse binary expression assignments", () => {
                const { nodes, errors, maps } = parse(`foo = bar + baz`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps(`foo = bar + baz`, <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar + baz", {
                        operator: maps("+"),
                        args: [
                            maps("bar", { name: maps("bar"), targets: [] }),
                            maps("baz", { name: maps("baz"), targets: [] })
                        ]
                    })
                }));
            });
        });

        describe("Compound setting names", () => {
            it("should parse prefix + suffix", () => {
                const { nodes, errors, maps } = parse(`
                    foo.aaa = "bbb"
                    bar[ccc] = "ddd"
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(2);

                expect(nodes[0]).toStrictEqual(maps('foo.aaa = "bbb"', <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo.aaa", { name: maps("foo"), targets: [maps("aaa")] }),
                    value: maps('"bbb"', "bbb")
                }));

                expect(nodes[1]).toStrictEqual(maps('bar[ccc] = "ddd"', <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("bar[ccc]", { name: maps("bar"), targets: [maps("ccc")] }),
                    value: maps('"ddd"', "ddd")
                }));
            });

            it("should parse prefix + list", () => {
                const { nodes, errors, maps } = parse('foo[aaa, bbb] = "bar"');

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps('foo[aaa, bbb] = "bar"', <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo[aaa, bbb]", { name: maps("foo"), targets: [maps("aaa"), maps("bbb")] }),
                    value: maps('"bar"', "bar")
                }));
            });

            it("should reject disjunction", () => {
                const { nodes, errors, locations } = parse('foo[aaa, bbb \x01or\x02 ccc] = "bar"');

                expect(nodes).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Disjunction cannot be used in setting assignments");
                expect(errors[0].location).toStrictEqual(locations.between(1, 2));
            });

            it("should parse wildcards", () => {
                const { nodes, errors, maps } = parse('foo[*] = "bar"');

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps('foo[*] = "bar"', <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo[*]", { name: maps("foo"), targets: [], wildcard: maps("*", true) }),
                    value: maps('"bar"', "bar")
                }));
            });
        });
    });
});
