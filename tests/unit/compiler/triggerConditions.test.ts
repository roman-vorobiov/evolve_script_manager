import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { createTriggerConditions as createTriggerConditionsImpl } from "$lib/core/dsl/compiler/triggerConditions";

import type * as Parser from "$lib/core/dsl/model/10";

const createTriggerConditions = (nodes: Parser.Statement[]) => processStatements(nodes, createTriggerConditionsImpl);

describe("Compiler", () => {
    describe("Trigger conditions", () => {
        it("should generate a dummy override", () => {
            const originalNode = {
                type: "Trigger",
                requirement: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 1 }
                },
                action: {
                    type: { type: "Identifier", value: "Build" },
                    id: { type: "Identifier", value: "city-bank" },
                    count: { type: "Number", value: 1 }
                },
                condition: { type: "Eval", value: "hello" }
            };

            const { nodes } = createTriggerConditions([originalNode as Parser.Trigger]);
            expect(nodes.length).toEqual(2);

            expect(nodes[0]).toBe(originalNode);

            const expectedNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "masterScriptToggle" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        { type: "Eval", value: "TriggerManager.priorityList[0].complete = !(hello)" },
                        { type: "Boolean", value: false }
                    ]
                }
            };

            expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
        });

        it("should ignore triggers w/o conditions", () => {
            const originalNode1 = {
                type: "Trigger",
                requirement: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 1 }
                },
                action: {
                    type: { type: "Identifier", value: "Build" },
                    id: { type: "Identifier", value: "city-bank" },
                    count: { type: "Number", value: 1 }
                }
            };

            const originalNode2 = {
                type: "Trigger",
                requirement: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 1 }
                },
                action: {
                    type: { type: "Identifier", value: "Build" },
                    id: { type: "Identifier", value: "city-bank" },
                    count: { type: "Number", value: 1 }
                },
                condition: { type: "Eval", value: "hello" }
            };

            const { nodes } = createTriggerConditions([originalNode1, originalNode2] as Parser.Trigger[]);
            expect(nodes.length).toEqual(3);

            expect(nodes[0]).toBe(originalNode1);
            expect(nodes[1]).toBe(originalNode2);

            const expectedNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "masterScriptToggle" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        { type: "Eval", value: "TriggerManager.priorityList[1].complete = !(hello)" },
                        { type: "Boolean", value: false }
                    ]
                }
            };

            expect(valuesOf(nodes[2])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[2])).toEqual(originsOf(expectedNode));
        });
    });
});
