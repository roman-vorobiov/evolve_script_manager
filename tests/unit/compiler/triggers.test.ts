import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf, getExcepion } from "./fixture";
import { createTriggerChains as createTriggerChainsImpl } from "$lib/core/dsl/compiler/triggers";
import { CompileError } from "$lib/core/dsl/model";

import type * as Parser from "$lib/core/dsl/model/8";

const createTriggerChains = (node: Parser.Statement) => processStatement(node, createTriggerChainsImpl);

describe("Compiler", () => {
    describe("Triggers", () => {
        it("should provide default count", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" }
                },
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
                condition: from(originalNode.condition, {
                    count: { type: "Number", value: 1 }
                }),
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
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 123 }
                },
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
                condition: originalNode.condition,
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve arpa ids", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 123 }
                },
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
                condition: originalNode.condition,
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
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 123 }
                },
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
                    condition: originalNode.condition,
                    action: originalNode.actions[0],
                    actions: undefined
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode, {
                    condition: {
                        type: { type: "Identifier", value: "Chain" },
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
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Number", value: 1.23 }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" }
                    }
                ]
            };

            const error = getExcepion(() => createTriggerChains(originalNode as Parser.Trigger));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Expected integer, got float");
                expect(error.offendingEntity).toBe(originalNode.condition.count);
            }
        });

        it("should throw on invalid trigger condition types", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Build" },
                    id: { type: "Identifier", value: "city-windmill" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" }
                    }
                ]
            };

            const error = getExcepion(() => createTriggerChains(originalNode as Parser.Trigger));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Unknown trigger condition 'Build'");
                expect(error.offendingEntity).toBe(originalNode.condition.type);
            }
        });

        it("should throw on invalid trigger condition ids", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "tech-club" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-bank" }
                    }
                ]
            };

            const error = getExcepion(() => createTriggerChains(originalNode as Parser.Trigger));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Unknown building 'tech-club'");
                expect(error.offendingEntity).toBe(originalNode.condition.id);
            }
        });

        it("should throw on invalid trigger action types", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Built" },
                        id: { type: "Identifier", value: "city-bank" }
                    }
                ]
            };

            const error = getExcepion(() => createTriggerChains(originalNode as Parser.Trigger));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Unknown trigger action 'Built'");
                expect(error.offendingEntity).toBe(originalNode.actions[0].type);
            }
        });

        it("should throw on invalid trigger action ids", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "tech-club" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "tech-club" }
                    }
                ]
            };

            const error = getExcepion(() => createTriggerChains(originalNode as Parser.Trigger));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Unknown building 'tech-club'");
                expect(error.offendingEntity).toBe(originalNode.condition.id);
            }
        });
    });
});
