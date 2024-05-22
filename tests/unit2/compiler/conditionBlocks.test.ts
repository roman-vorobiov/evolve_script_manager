import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { applyConditionBlocks as applyConditionBlocksImpl } from "$lib/core/dsl2/compiler/conditionBlocks";

import type * as Parser from "$lib/core/dsl2/model/6";

const applyConditionBlocks = (nodes: Parser.Statement[]) => processStatements(nodes, applyConditionBlocksImpl);

describe("Compiler", () => {
    describe("Condition blocks", () => {
        it("should apply conditions to nested statements", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 }
            };

            const blockCondition = {
                type: "Subscript",
                base: { type: "Identifier", value: "ResourceDemanded" },
                key: { type: "Identifier", value: "Copper" },
            };

            const { nodes, from } = applyConditionBlocks([
                <Parser.ConditionPush> { type: "ConditionPush", condition: blockCondition },
                    <Parser.SettingAssignment> originalNode,
                <Parser.ConditionPop> { type: "ConditionPop" }
            ]);

            const expectedNode = from(originalNode, {
                condition: blockCondition
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should join conditions of nested statements", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" },
                }
            };

            const blockCondition = {
                type: "Subscript",
                base: { type: "Identifier", value: "ResourceDemanded" },
                key: { type: "Identifier", value: "Stone" },
            };

            const { nodes, from } = applyConditionBlocks([
                <Parser.ConditionPush> { type: "ConditionPush", condition: blockCondition },
                    <Parser.SettingAssignment> originalNode,
                <Parser.ConditionPop> { type: "ConditionPop" }
            ]);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    type: "Expression",
                    operator: "and",
                    args: [blockCondition, originalNode.condition]
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should combine nested blocks", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" },
                }
            };

            const blockConditionOuter = {
                type: "Subscript",
                base: { type: "Identifier", value: "ResourceDemanded" },
                key: { type: "Identifier", value: "Stone" },
            };

            const blockConditionInner = {
                type: "Subscript",
                base: { type: "Identifier", value: "ResourceDemanded" },
                key: { type: "Identifier", value: "Coal" },
            };

            const { nodes, from } = applyConditionBlocks([
                <Parser.ConditionPush> { type: "ConditionPush", condition: blockConditionOuter },
                    <Parser.ConditionPush> { type: "ConditionPush", condition: blockConditionInner },
                        <Parser.SettingAssignment> originalNode,
                    <Parser.ConditionPop> { type: "ConditionPop" },

                    <Parser.SettingAssignment> originalNode,
                <Parser.ConditionPop> { type: "ConditionPop" }
            ]);

            expect(nodes.length).toEqual(2);
            {
                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        type: "Expression",
                        operator: "and",
                        args: [
                            from(blockConditionInner, {
                                type: "Expression",
                                operator: "and",
                                args: [blockConditionOuter, blockConditionInner]
                            }),
                            originalNode.condition
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        type: "Expression",
                        operator: "and",
                        args: [blockConditionOuter, originalNode.condition]
                    })
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
        });
    });
});
