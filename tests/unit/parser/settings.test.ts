import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

import type { Identifier, SettingAssignment } from "$lib/core/dsl/parser/model";

describe("Parser", () => {
    describe("Settings", () => {
        describe("Simple setting names", () => {
            it.each([
                { source: "bar", target: "bar" },
                { source: "123", target: 123 },
                { source: "-123", target: -123 },
                { source: "1.23", target: 1.23 },
                { source: "-1.23", target: -1.23 },
                { source: "ON", target: true },
                { source: "OFF", target: false },
            ])("should parse value assignments", ({ source, target }) => {
                const { nodes, errors, maps } = parse(`foo = ${source}`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps(`foo = ${source}`, <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps(source, target)
                }));
            });
        });

        describe("Compound setting names", () => {
            it("should parse prefix + suffix", () => {
                const { nodes, errors, maps } = parse("foo.bar = baz");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo.bar = baz", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo.bar", { name: maps("foo"), targets: [maps("bar")] }),
                    value: maps("baz")
                }));
            });
        });
    });
});
