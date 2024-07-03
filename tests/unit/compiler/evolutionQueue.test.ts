import { describe, it, expect } from "vitest";
import { processStatements } from "./fixture";
import { buildEvolutionQueue as buildEvolutionQueueImpl } from "$lib/core/dsl/compiler/evolutionQueue";

import type * as Parser from "$lib/core/dsl/model/8_intermediate";

const buildEvolutionQueue = (nodes: Parser.Statement[]) => processStatements(nodes, buildEvolutionQueueImpl);

describe("Compiler", () => {
    describe("Evolution queue", () => {
        it("should ignore other settings", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode]);
            expect(nodes.length).toEqual(1);

            expect(nodes[0]).toBe(originalNode);
        });

        it("should throw on wrong setting", () => {
            const originalNode = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "hello" },
                body: []
            };

            const { errors } = buildEvolutionQueue([originalNode as Parser.SettingShiftBlock]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'evolutionQueue' expected");
            expect(errors[0].offendingEntity).toBe(originalNode.setting);
        });

        it("should throw on conditions", () => {
            const originalNode = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 },
                        condition: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" }
                        }
                    }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode as Parser.SettingShiftBlock]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Evolution queue settings must not have conditions");
            expect(errors[0].offendingEntity).toBe(originalNode.body[0].condition);
        });

        it("should throw on missing evolution target", () => {
            const originalNode = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "prestigeType" },
                        value: { type: "Boolean", value: "bar" }
                    }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode as Parser.SettingShiftBlock]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'userEvolutionTarget' is not specified");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });

        it("should throw on missing prestige type", () => {
            const originalNode = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "userEvolutionTarget" },
                        value: { type: "Number", value: "foo" }
                    }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode as Parser.SettingShiftBlock]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'prestigeType' is not specified");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });

        it("should generate queue entries with body statement", () => {
            const originalNode = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "userEvolutionTarget" },
                        value: { type: "Number", value: "foo" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "prestigeType" },
                        value: { type: "Boolean", value: "bar" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 }
                    }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode as Parser.SettingShiftBlock]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingPush = {
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: [
                    {
                        userEvolutionTarget: "foo",
                        prestigeType: "bar",
                        hello: 123
                    }
                ]
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should join multiple statements", () => {
            const originalNode1 = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "userEvolutionTarget" },
                        value: { type: "Number", value: "foo" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "prestigeType" },
                        value: { type: "Boolean", value: "bar" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 }
                    }
                ]
            };
            const originalNode2 = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "userEvolutionTarget" },
                        value: { type: "Number", value: "bar" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "prestigeType" },
                        value: { type: "Boolean", value: "baz" }
                    }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode1, originalNode2] as Parser.SettingShiftBlock[]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingPush = {
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: [
                    {
                        userEvolutionTarget: "foo",
                        prestigeType: "bar",
                        hello: 123
                    },
                    {
                        userEvolutionTarget: "bar",
                        prestigeType: "baz"
                    }
                ]
            };

            expect(nodes[0]).toEqual(expectedNode);
        });
    });
});
