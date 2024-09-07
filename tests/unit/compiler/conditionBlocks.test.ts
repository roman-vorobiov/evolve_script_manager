import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { applyConditionBlocks as applyConditionBlocksImpl } from "$lib/core/dsl/compiler/conditionBlocks";

import type * as Parser from "$lib/core/dsl/model/6";

const applyConditionBlocks = (nodes: Parser.Statement[]) => processStatements(nodes, applyConditionBlocksImpl);

describe("Compiler", () => {
    describe("Condition blocks", () => {
        it("should apply conditions to nested setting assignments", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" },
                },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 }
                    }
                ]
            };

            const { nodes, from } = applyConditionBlocks([originalNode as Parser.ConditionBlock]);

            const expectedNode = from(originalNode.body[0], {
                condition: originalNode.condition
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should apply conditions to nested triggers", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" },
                },
                body: [
                    {
                        type: "Trigger",
                        actions: [
                            {
                                type: { type: "Identifier", value: "Build" },
                                id: { type: "Identifier", value: "city-bank" }
                            }
                        ]
                    }
                ]
            };

            const { nodes, from } = applyConditionBlocks([originalNode as Parser.ConditionBlock]);

            const expectedNode = from(originalNode.body[0], {
                condition: originalNode.condition
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should join conditions of nested statements", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" },
                },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 },
                        condition: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" },
                        }
                    }
                ]
            };

            const { nodes, from } = applyConditionBlocks([originalNode as Parser.ConditionBlock]);

            const expectedNode = from(originalNode.body[0], {
                condition: from(originalNode.body[0].condition, {
                    type: "Expression",
                    operator: "and",
                    args: [originalNode.condition, originalNode.body[0].condition]
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should combine nested blocks", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Stone" },
                },
                body: [
                    {
                        type: "ConditionBlock",
                        condition: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Coal" },
                        },
                        body: [
                            {
                                type: "SettingAssignment",
                                setting: { type: "Identifier", value: "hello" },
                                value: { type: "Number", value: 123 },
                                condition: {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "ResourceDemanded" },
                                    key: { type: "Identifier", value: "Copper" },
                                }
                            }
                        ]
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 },
                        condition: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" },
                        }
                    }
                ]
            };

            const { nodes, from } = applyConditionBlocks([originalNode as Parser.ConditionBlock]);

            expect(nodes.length).toEqual(2);
            {
                const expectedNode = from(originalNode.body[0].body![0], {
                    condition: from(originalNode.body[0].body![0].condition, {
                        type: "Expression",
                        operator: "and",
                        args: [
                            from(originalNode.body[0].condition, {
                                type: "Expression",
                                operator: "and",
                                args: [originalNode.condition, originalNode.body[0].condition]
                            }),
                            originalNode.body[0].body![0].condition
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[1], {
                    condition: from(originalNode.body[1].condition, {
                        type: "Expression",
                        operator: "and",
                        args: [originalNode.condition, originalNode.body[1].condition]
                    })
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
        });

        it("should throw on nested evolution queue declarations", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" },
                },
                body: [
                    {
                        type: "SettingShiftBlock",
                        setting: { type: "Identifier", value: "evolutionQueue" },
                        body: []
                    }
                ]
            };

            const { errors } = applyConditionBlocks([originalNode as Parser.ConditionBlock]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Evolution queue cannot be set conditionally");
            expect(errors[0].offendingEntity).toBe(originalNode.body[0]);
        });
    });
});
