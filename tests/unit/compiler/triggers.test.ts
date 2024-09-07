import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf } from "./fixture";
import { createTriggerChains as createTriggerChainsImpl } from "$lib/core/dsl/compiler/triggers";

import type * as Parser from "$lib/core/dsl/model/9";

const createTriggerChains = (node: Parser.Statement) => processStatement(node, createTriggerChainsImpl);

export const defaultRequirement = {
    type: { type: "Identifier", value: "Boolean" },
    id: { type: "Boolean", value: true },
    count: { type: "Number", value: 1 }
};

describe("Compiler", () => {
    describe("Triggers", () => {
        it("should provide default count", () => {
            const originalNode = {
                type: "Trigger",
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" }
                    }
                ]
            };

            const { nodes, from } = createTriggerChains(originalNode as Parser.Trigger);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                requirement: defaultRequirement,
                action: from(originalNode.actions[0], {
                    count: { type: "Number", value: 1 }
                }),
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should preserve provided count", () => {
            const originalNode = {
                type: "Trigger",
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" },
                        count: { type: "Number", value: 456 }
                    }
                ]
            };

            const { nodes, from } = createTriggerChains(originalNode as Parser.Trigger);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                requirement: defaultRequirement,
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve arpa ids", () => {
            const originalNode = {
                type: "Trigger",
                actions: [
                    {
                        type: { type: "Identifier", value: "Arpa" },
                        id: { type: "Identifier", value: "lhc" },
                        count: { type: "Number", value: 456 }
                    }
                ]
            };

            const { nodes, from } = createTriggerChains(originalNode as Parser.Trigger);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                requirement: defaultRequirement,
                action: from(originalNode.actions[0], {
                    id: from(originalNode.actions[0].id, { value: "arpalhc" })
                }),
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should create trigger chains", () => {
            const originalNode = {
                type: "Trigger",
                actions: [
                    {
                        type: { type: "Identifier", value: "Research" },
                        id: { type: "Identifier", value: "tech-club" },
                        count: { type: "Number", value: 456 }
                    },
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" },
                        count: { type: "Number", value: 789 }
                    }
                ]
            };

            const { nodes, from } = createTriggerChains(originalNode as Parser.Trigger);
            expect(nodes.length).toEqual(2);

            {
                const expectedNode = from(originalNode, {
                    requirement: defaultRequirement,
                    action: originalNode.actions[0],
                    actions: undefined
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode, {
                    requirement: {
                        type: { type: "Identifier", value: "chain" },
                        id: { type: "Identifier", value: "" },
                        count: { type: "Number", value: 0 }
                    },
                    action: originalNode.actions[1],
                    actions: undefined
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
        });

        it("should throw on invalid count values", () => {
            const originalNode = {
                type: "Trigger",
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" },
                        count: { type: "Number", value: 1.23 }
                    }
                ]
            };

            const { errors } = createTriggerChains(originalNode as Parser.Trigger);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected integer, got float");
            expect(errors[0].offendingEntity).toBe(originalNode.actions[0].count);
        });
    });
});
