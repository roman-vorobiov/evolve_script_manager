import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { normalizeStatements as normalizeStatementsImpl } from "$lib/core/dsl/compiler/normalize";

import type * as Parser from "$lib/core/dsl/model/9";

const normalizeStatements = (nodes: Parser.Statement[]) => processStatements(nodes, normalizeStatementsImpl);

describe("Compiler", () => {
    describe("Normalization", () => {
        it("should generate settings if the value is constant", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 }
            };

            const { nodes, from } = normalizeStatements([originalNode] as Parser.SettingAssignment[]);

            const expectedNode = from(originalNode, {
                type: "SettingAssignment",
                setting: "hello",
                value: 123
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should generate lists for 'researchIgnore'", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "researchIgnore" },
                value: { type: "String", value: "foo,bar" }
            };

            const { nodes, from } = normalizeStatements([originalNode] as Parser.SettingAssignment[]);

            const expectedNode = from(originalNode, {
                type: "SettingAssignment",
                setting: "researchIgnore",
                value: ["foo", "bar"]
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should generate overrides if the value is not constant", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Eval", value: "123" }
            };

            const { nodes, from } = normalizeStatements([originalNode] as Parser.SettingAssignment[]);

            const expectedNode = from(originalNode, {
                type: "Override",
                setting: "hello",
                value: {
                    type1: "Boolean",
                    arg1: true,
                    cmp: "A?B",
                    type2: "Eval",
                    arg2: "123",
                    ret: null
                }
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should generate overrides if the value is not constant (with condition)", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Eval", value: "123" },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { nodes, from } = normalizeStatements([originalNode] as Parser.SettingAssignment[]);

            const expectedNode = from(originalNode, {
                type: "Override",
                setting: "hello",
                value: {
                    type1: "ResourceDemanded",
                    arg1: "Copper",
                    cmp: "A?B",
                    type2: "Eval",
                    arg2: "123",
                    ret: null
                }
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should generate overrides if condition exists", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Stone" }
                        }
                    ]
                }
            };

            const { nodes, from } = normalizeStatements([originalNode] as Parser.SettingAssignment[]);

            const expectedNode = from(originalNode, {
                type: "Override",
                setting: "hello",
                value: {
                    type1: "ResourceDemanded",
                    arg1: "Copper",
                    cmp: "AND",
                    type2: "ResourceDemanded",
                    arg2: "Stone",
                    ret: 123
                }
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should generate triggers", () => {
            const originalNode1 = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 123 }
                },
                action: {
                    type: { type: "Identifier", value: "Build" },
                    id: { type: "Identifier", value: "city-bank" },
                    count: { type: "Number", value: 456 }
                }
            };

            const originalNode2 = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Researched" },
                    id: { type: "Identifier", value: "tech-club" },
                    count: { type: "Number", value: 456 }
                },
                action: {
                    type: { type: "Identifier", value: "Arpa" },
                    id: { type: "Identifier", value: "arpalhc" },
                    count: { type: "Number", value: 789 }
                }
            };

            const { nodes, from } = normalizeStatements([originalNode1, originalNode2] as Parser.Trigger[]);
            expect(nodes.length).toEqual(2);

            {
                const expectedNode = from(originalNode1, {
                    type: "Trigger",
                    value: {
                        seq: 0,
                        priority: 0,
                        requirementType: "built",
                        requirementId: "city-windmill",
                        requirementCount: 123,
                        actionType: "build",
                        actionId: "city-bank",
                        actionCount: 456,
                        complete: false
                    }
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode2, {
                    type: "Trigger",
                    value: {
                        seq: 1,
                        priority: 1,
                        requirementType: "researched",
                        requirementId: "tech-club",
                        requirementCount: 456,
                        actionType: "arpa",
                        actionId: "arpalhc",
                        actionCount: 789,
                        complete: false
                    }
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
        });
    });
});
