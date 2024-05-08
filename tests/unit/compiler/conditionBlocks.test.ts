import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withDummyLocation, makeSettingId } from "./fixture";

import type { ConditionPush, ConditionPop, SettingAssignment } from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
    describe("Condition blocks", () => {
        it("should add conditions to assignments", () => {
            const pushNode = withDummyLocation(<ConditionPush> {
                type: "ConditionPush",
                condition: withDummyLocation({
                    name: withDummyLocation("ResourceDemanded"),
                    targets: [withDummyLocation("Lumber")]
                })
            });

            const settingNode = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("autoBuild"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([pushNode, settingNode]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0]).toStrictEqual({
                type: "Override",
                target: "autoBuild",
                value: true,
                condition: {
                    op: "==",
                    left: { type: "ResourceDemanded", value: "Lumber" },
                    right: { type: "Boolean", value: true }
                }
            });
        });

        it("should combine scope conditions", () => {
            const pushNode1 = withDummyLocation(<ConditionPush> {
                type: "ConditionPush",
                condition: withDummyLocation({
                    name: withDummyLocation("ResourceDemanded"),
                    targets: [withDummyLocation("Lumber")]
                })
            });

            const pushNode2 = withDummyLocation(<ConditionPush> {
                type: "ConditionPush",
                condition: withDummyLocation({
                    name: withDummyLocation("RacePillared"),
                    targets: [withDummyLocation("Imitation")]
                })
            });

            const settingNode = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("autoBuild"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([pushNode1, pushNode2, settingNode]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0]).toStrictEqual({
                type: "Override",
                target: "autoBuild",
                value: true,
                condition: {
                    op: "AND",
                    left: { type: "ResourceDemanded", value: "Lumber" },
                    right: { type: "RacePillared", value: "srace" }
                }
            });
        });

        it("should pop the condition from the context", () => {
            const pushNode1 = withDummyLocation(<ConditionPush> {
                type: "ConditionPush",
                condition: withDummyLocation({
                    name: withDummyLocation("ResourceDemanded"),
                    targets: [withDummyLocation("Lumber")]
                })
            });

            const pushNode2 = withDummyLocation(<ConditionPush> {
                type: "ConditionPush",
                condition: withDummyLocation({
                    name: withDummyLocation("RacePillared"),
                    targets: [withDummyLocation("Imitation")]
                })
            });

            const settingNode = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("autoBuild"),
                value: withDummyLocation(true)
            });

            const popNode = withDummyLocation(<ConditionPop> {
                type: "ConditionPop"
            });

            const { statements, errors } = compile([pushNode1, pushNode2, popNode, settingNode]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0]).toStrictEqual({
                type: "Override",
                target: "autoBuild",
                value: true,
                condition: {
                    op: "==",
                    left: { type: "ResourceDemanded", value: "Lumber" },
                    right: { type: "Boolean", value: true }
                }
            });
        });

        it("should combine scope conditions with inline ones", () => {
            const pushNode = withDummyLocation(<ConditionPush> {
                type: "ConditionPush",
                condition: withDummyLocation({
                    name: withDummyLocation("ResourceDemanded"),
                    targets: [withDummyLocation("Lumber")]
                })
            });

            const settingNode = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("autoBuild"),
                value: withDummyLocation(true),
                condition: withDummyLocation({
                    name: withDummyLocation("RacePillared"),
                    targets: [withDummyLocation("Imitation")]
                })
            });

            const { statements, errors } = compile([pushNode, settingNode]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0]).toStrictEqual({
                type: "Override",
                target: "autoBuild",
                value: true,
                condition: {
                    op: "AND",
                    left: { type: "ResourceDemanded", value: "Lumber" },
                    right: { type: "RacePillared", value: "srace" }
                }
            });
        });
    });
});
