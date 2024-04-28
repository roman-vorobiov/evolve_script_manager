import { describe, it, expect } from "vitest";
import { generateConfig } from "$lib/core/dsl/generator/generate";
import type { SettingAssignment, Trigger } from "$lib/core/dsl/compiler/model";

describe("Generator", () => {
    describe("Settings", () => {
        it("should generate settings", () => {
            const statement: SettingAssignment = {
                type: "SettingAssignment",
                setting: "key",
                value: "value"
            };

            const { config, errors } = generateConfig([statement]);

            expect(errors).toStrictEqual([]);

            expect(config).toStrictEqual({
                triggers: [],
                key: "value"
            });
        });
    });

    describe("Triggers", () => {
        it("should generate triggers", () => {
            const statement: Trigger = {
                type: "Trigger",
                actionType: "action",
                actionId: "foo",
                actionCount: 123,
                conditionType: "requirement",
                conditionId: "bar",
                conditionCount: 456
            };

            const { config, errors } = generateConfig([statement]);

            expect(errors).toStrictEqual([]);

            expect(config).toStrictEqual({
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
});
