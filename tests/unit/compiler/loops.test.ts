import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { inlineReferences as inlineReferencesImpl } from "$lib/core/dsl/compiler/inlineReferences";

import type * as Parser from "$lib/core/dsl/model/0";

const inlineReferences = (nodes: Parser.Statement[]) => processStatements(nodes, inlineReferencesImpl);

describe("Compiler", () => {
    describe("Loops", () => {
        it("should unroll loop body", () => {
            const originalNode = {
                type: "Loop",
                iteratorName: { type: "Identifier", value: "foo" },
                values: {
                    type: "List",
                    values: [
                        { type: "Identifier", value: "Copper" },
                        { type: "Identifier", value: "Stone" }
                    ]
                },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "AutoSell" },
                            key: { type: "Identifier", value: "$foo" }
                        },
                        value: { type: "Boolean", value: true }
                    },
                    {
                        type: "SettingAssignment",
                        setting: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "AutoSellRatio" },
                            key: { type: "Identifier", value: "$foo" }
                        },
                        value: { type: "Number", value: 123 }
                    }
                ]
            };

            const { nodes, from } = inlineReferences([originalNode as Parser.Loop]);
            expect(nodes.length).toEqual(4);

            {
                const expectedNode = from(originalNode.body[0], {
                    setting: from(originalNode.body[0].setting, {
                        key: originalNode.values.values[0]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[1], {
                    setting: from(originalNode.body[1].setting, {
                        key: originalNode.values.values[0]
                    })
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[0], {
                    setting: from(originalNode.body[0].setting, {
                        key: originalNode.values.values[1]
                    })
                });

                expect(valuesOf(nodes[2])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[2])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[1], {
                    setting: from(originalNode.body[1].setting, {
                        key: originalNode.values.values[1]
                    })
                });

                expect(valuesOf(nodes[3])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[3])).toEqual(originsOf(expectedNode));
            }
        });

        it("should handle nested loops", () => {
            const originalNode = {
                type: "Loop",
                iteratorName: { type: "Identifier", value: "foo" },
                values: {
                    type: "List",
                    values: [
                        { type: "Identifier", value: "Lumber" },
                        { type: "Identifier", value: "Food" }
                    ]
                },
                body: [
                    {
                        type: "Loop",
                        iteratorName: { type: "Identifier", value: "bar" },
                        values: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "Copper" },
                                { type: "Identifier", value: "Stone" }
                            ]
                        },
                        body: [
                            {
                                type: "SettingAssignment",
                                setting: {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "AutoSell" },
                                    key: { type: "Identifier", value: "$foo" }
                                },
                                value: { type: "Boolean", value: true },
                                condition: {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "ResourceDemanded" },
                                    key: { type: "Identifier", value: "$bar" }
                                }
                            }
                        ]
                    }
                ]
            };

            const { nodes, from } = inlineReferences([originalNode as Parser.Loop]);
            expect(nodes.length).toEqual(4);

            {
                const expectedNode = from(originalNode.body[0].body[0], {
                    setting: from(originalNode.body[0].body[0].setting, {
                        key: originalNode.values.values[0]
                    }),
                    condition: from(originalNode.body[0].body[0].condition, {
                        key: originalNode.body[0].values.values[0]
                    }),
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[0].body[0], {
                    setting: from(originalNode.body[0].body[0].setting, {
                        key: originalNode.values.values[0]
                    }),
                    condition: from(originalNode.body[0].body[0].condition, {
                        key: originalNode.body[0].values.values[1]
                    }),
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[0].body[0], {
                    setting: from(originalNode.body[0].body[0].setting, {
                        key: originalNode.values.values[1]
                    }),
                    condition: from(originalNode.body[0].body[0].condition, {
                        key: originalNode.body[0].values.values[0]
                    }),
                });

                expect(valuesOf(nodes[2])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[2])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode.body[0].body[0], {
                    setting: from(originalNode.body[0].body[0].setting, {
                        key: originalNode.values.values[1]
                    }),
                    condition: from(originalNode.body[0].body[0].condition, {
                        key: originalNode.body[0].values.values[1]
                    }),
                });

                expect(valuesOf(nodes[3])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[3])).toEqual(originsOf(expectedNode));
            }
        });

        it("should warn on redefinition", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 },
                parameterized: false
            };

            const defNode2: Parser.Loop = {
                type: "Loop",
                iteratorName: { type: "Identifier", value: "foo" },
                values: {
                    type: "List",
                    values: []
                },
                body: []
            };

            const { warnings } = inlineReferences([defNode1, defNode2]);
            expect(warnings.length).toEqual(1);

            expect(warnings[0].message).toEqual("Redefinition of 'foo'");
            expect(warnings[0].offendingEntity).toBe(defNode2.iteratorName);
        });
    });
});
