import { describe, it, expect } from "vitest";
import { generateConfig } from "$lib/core/dsl/generator/generate";
import type { SettingAssignment, Override, Trigger } from "$lib/core/dsl/compiler/model";

describe("Generator", () => {
    it("should generate settings", () => {
        const statement: SettingAssignment = {
            type: "SettingAssignment",
            setting: "key",
            value: "value"
        };

        const { config, errors } = generateConfig([statement]);

        expect(errors).toStrictEqual([]);

        expect(config).toStrictEqual({
            overrides: {},
            triggers: [],
            key: "value"
        });
    });

    it("should generate overrides", () => {
        const statement: Override = {
            type: "Override",
            target: "foo",
            value: 123,
            condition: {
                op: "a",
                left: { type: "b", value: 456 },
                right: { type: "c", value: "d" }
            }
        };

        const { config, errors } = generateConfig([statement]);

        expect(errors).toStrictEqual([]);

        expect(config).toStrictEqual({
            overrides: {
                foo: [
                    {
                        type1: "b",
                        arg1: 456,
                        type2: "c",
                        arg2: "d",
                        cmp: "a",
                        ret: 123
                    }
                ]
            },
            triggers: []
        });
    });

    it("should generate triggers", () => {
        const statement: Trigger = {
            type: "Trigger",
            action: { type: "action", id: "foo", count: 123, },
            condition: { type: "requirement", id: "bar", count: 456 }
        };

        const { config, errors } = generateConfig([statement]);

        expect(errors).toStrictEqual([]);

        expect(config).toStrictEqual({
            overrides: {},
            triggers: [
                {
                    seq: 0,
                    priority: 0,
                    actionType: "action",
                    actionId: "foo",
                    actionCount: 123,
                    requirementType: "requirement",
                    requirementId: "bar",
                    requirementCount: 456,
                    complete: false
                }
            ]
        });
    });
});
