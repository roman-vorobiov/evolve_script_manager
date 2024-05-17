import { describe, it, expect } from "vitest";
import { resolveWildcards, valuesOf, originsOf } from "./fixture";

import * as Parser from "$lib/core/dsl2/model";

describe("Compiler", () => {
    describe("Wildcards", () => {
        it("should resolve wildcards in setting prefixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SmelterFuelPriority" },
                    key: { type: "Wildcard" }
                },
                value: { type: "Number", value: 123 }
            };

            const { node, from } = resolveWildcards(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                setting: from(originalNode.setting, {
                    key: from(originalNode.setting.key, {
                        type: "List",
                        values: [
                            from(originalNode.setting.key, { type: "Identifier", value: "Oil" }),
                            from(originalNode.setting.key, { type: "Identifier", value: "Coal" }),
                            from(originalNode.setting.key, { type: "Identifier", value: "Wood" }),
                            from(originalNode.setting.key, { type: "Identifier", value: "Inferno" }),
                        ]
                    })
                })
            });

            expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
            expect(originsOf(node)).toEqual(originsOf(expectedNode));
        });
    });
});
