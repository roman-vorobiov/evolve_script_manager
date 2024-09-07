import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf } from "./fixture";
import { createTriggerChains as createTriggerChainsImpl } from "$lib/core/dsl/compiler/triggers";

import type * as Parser from "$lib/core/dsl/model/9";

const createTriggerChains = (node: Parser.Statement) => processStatement(node, createTriggerChainsImpl);

describe("Compiler", () => {
    describe("Trigger conditions", () => {
        it("should provide default requirement", () => {
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
                requirement: {
                    type: { type: "Identifier", value: "Boolean" },
                    id: { type: "Boolean", value: true },
                    count: { type: "Number", value: 1 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (subscript)", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "Foo" },
                    key: { type: "Identifier", value: "Bar" }
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
                requirement: {
                    type: { type: "Identifier", value: "Foo" },
                    id: { type: "Identifier", value: "Bar" },
                    count: { type: "Number", value: 1 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (eval)", () => {
            const originalNode = {
                type: "Trigger",
                condition: { type: "Eval", value: "hello" },
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
                requirement: {
                    type: { type: "Identifier", value: "Eval" },
                    id: { type: "Identifier", value: "hello" },
                    count: { type: "Number", value: 1 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (constant)", () => {
            const originalNode = {
                type: "Trigger",
                condition: { type: "String", value: "hello" },
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
                requirement: {
                    type: { type: "Identifier", value: "Eval" },
                    id: { type: "Identifier", value: "'hello'" },
                    count: { type: "Number", value: 1 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (unary expression)", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: "Expression",
                    operator: "not",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "Foo" },
                            key: { type: "Identifier", value: "Bar" }
                        }
                    ]
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
                requirement: {
                    type: { type: "Identifier", value: "Foo" },
                    id: { type: "Identifier", value: "Bar" },
                    count: { type: "Number", value: 0 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (binary expression)", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: "Expression",
                    operator: "==",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "Foo" },
                            key: { type: "Identifier", value: "Bar" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "Bar" },
                            key: { type: "Identifier", value: "Foo" }
                        }
                    ]
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
                requirement: {
                    type: { type: "Identifier", value: "Eval" },
                    id: { type: "Identifier", value: "_('Foo', 'Bar') == _('Bar', 'Foo')" },
                    count: { type: "Number", value: 1 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (number comparison (L))", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: "Expression",
                    operator: "==",
                    args: [
                        { type: "Number", value: 123 },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "Bar" },
                            key: { type: "Identifier", value: "Foo" }
                        }
                    ]
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
                requirement: {
                    type: { type: "Identifier", value: "Bar" },
                    id: { type: "Identifier", value: "Foo" },
                    count: { type: "Number", value: 123 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should use condition as requirement (number comparison (R))", () => {
            const originalNode = {
                type: "Trigger",
                condition: {
                    type: "Expression",
                    operator: "==",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "Foo" },
                            key: { type: "Identifier", value: "Bar" }
                        },
                        { type: "Number", value: 123 }
                    ]
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
                requirement: {
                    type: { type: "Identifier", value: "Foo" },
                    id: { type: "Identifier", value: "Bar" },
                    count: { type: "Number", value: 123 }
                },
                action: originalNode.actions[0],
                actions: undefined
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });
    });
});
