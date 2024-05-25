import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { inlineReferences as inlineReferencesImpl } from "$lib/core/dsl/compiler/inlineReferences";

import type * as Parser from "$lib/core/dsl/model/0";

const inlineReferences = (nodes: Parser.Statement[]) => processStatements(nodes, inlineReferencesImpl);

describe("Compiler", () => {
    describe("Variables", () => {
        it("should repace references with definitions recursively", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const defNode2 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "bar" },
                body: {
                    type: "Expression",
                    operator: "+",
                    args: [
                        { type: "Identifier", value: "$foo" },
                        { type: "Number", value: 123 }
                    ]
                }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "$bar" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode1,
                <Parser.ExpressionDefinition> defNode2,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(defNode2.body, {
                    args: [
                        defNode1.body,
                        defNode2.body.args[1]
                    ]
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on self-references", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "bar" },
                body: {
                    type: "Expression",
                    operator: "+",
                    args: [
                        { type: "Identifier", value: "$foo" },
                        { type: "Number", value: 123 }
                    ]
                }
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'foo' is not defined");
            expect(errors[0].offendingEntity).toBe(defNode.body.args[0]);
        });

        it("should validate subscript base type", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "$foo" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition, originalNode as Parser.SettingAssignment]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected, got Number");
            expect(errors[0].offendingEntity).toBe(originalNode.value.base);
        });

        it("should validate subscript key type", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "$foo" }
                }
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition, originalNode as Parser.SettingAssignment]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier, Subscript or List expected, got Number");
            expect(errors[0].offendingEntity).toBe(originalNode.value.key);
        });

        it("should throw on undefined variables", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "$foo" }
                }
            };

            const { errors } = inlineReferences([originalNode as Parser.SettingAssignment]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'foo' is not defined");
            expect(errors[0].offendingEntity).toBe(originalNode.value.key);
        });

        it("should throw on placeholders", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Placeholder" }
                }
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(defNode.body.key);
        });

        it("should be limited to a lexical scope", () => {
            const defNode1 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const defNode2 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 456 }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "$foo" }
            };

            const { warnings, nodes, from } = inlineReferences([
                <Parser.ConditionPush> { type: "ConditionPush", condition: { type: "Eval", value: "hello" } },
                    <Parser.ExpressionDefinition> defNode1,

                    <Parser.ConditionPush> { type: "ConditionPush", condition: { type: "Eval", value: "hello" } },
                        <Parser.ExpressionDefinition> defNode2,
                        <Parser.SettingAssignment> originalNode,
                    <Parser.ConditionPop> { type: "ConditionPop" },

                    <Parser.SettingAssignment> originalNode,
                <Parser.ConditionPop> { type: "ConditionPop" }
            ]);
            expect(nodes.length).toEqual(6);

            expect(warnings[0].message).toEqual("Redefinition of 'foo'");
            expect(warnings[0].offendingEntity).toBe(defNode2);
            expect(warnings[0].details.length).toEqual(1);
            expect(warnings[0].details[0][0]).toEqual("Previously defined here");
            expect(warnings[0].details[0][1]).toBe(defNode1);

            {
                const expectedNode = from(originalNode, {
                    value: defNode2.body
                });

                expect(valuesOf(nodes[2])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[2])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(originalNode, {
                    value: defNode1.body
                });

                expect(valuesOf(nodes[4])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[4])).toEqual(originsOf(expectedNode));
            }
        });

        it("should throw on redefinitions in the same scope", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const defNode2: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 456 }
            };

            const { warnings } = inlineReferences([defNode1, defNode2]);
            expect(warnings.length).toEqual(1);

            expect(warnings[0].message).toEqual("Redefinition of 'foo'");
            expect(warnings[0].offendingEntity).toBe(defNode2);
            expect(warnings[0].details.length).toEqual(1);
            expect(warnings[0].details[0][0]).toEqual("Previously defined here");
            expect(warnings[0].details[0][1]).toBe(defNode1);
        });

        it("should repace references inside condition blocks", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode = {
                type: "ConditionPush",
                condition: { type: "Identifier", value: "$foo" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.ConditionPush> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                condition: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references inside setting ids", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "$foo" },
                value: { type: "Number", value: 456 }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                setting: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references nested inside setting ids", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "Copper" }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Identifier", value: "$foo" }
                },
                value: { type: "Number", value: 456 }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                setting: from(originalNode.setting, {
                    key: defNode.body
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should validate setting node type", () => {
            const defNode: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "$foo" },
                value: { type: "Number", value: 456 }
            };

            const { errors } = inlineReferences([defNode, originalNode as Parser.SettingAssignment]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier or Subscript expected, got Number");
            expect(errors[0].offendingEntity).toBe(originalNode.setting);
        });

        it("should repace references inside setting values", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "$foo" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references inside setting conditions", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" }
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 456 },
                condition: { type: "Identifier", value: "$foo" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                condition: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references inside setting shift ids", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" }
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "$foo" },
                value: { type: "String", value: "123" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingShift> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                setting: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should validate setting node type (shift)", () => {
            const defNode: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "$foo" },
                value: { type: "String", value: "456" }
            };

            const { errors } = inlineReferences([defNode, originalNode as Parser.SettingShift]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected, got Number");
            expect(errors[0].offendingEntity).toBe(originalNode.setting);
        });

        it("should repace references inside setting shift values", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" }
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "$foo" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingShift> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references inside setting shift conditions", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" }
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "String", value: "asd" },
                condition: { type: "Identifier", value: "$foo" }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingShift> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                condition: defNode.body
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references inside trigger IDs", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" }
            };

            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "$foo" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "$foo" }
                    }
                ]
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.Trigger> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    id: defNode.body
                }),
                actions: [
                    from(originalNode.actions[0], {
                        id: defNode.body
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should validate trigger ID type", () => {
            const defNode: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode: Parser.Trigger = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "$foo" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "$foo" }
                    }
                ]
            };

            const { errors } = inlineReferences([defNode, originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected, got Number");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.id);
        });

        it("should repace references inside trigger counts", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 }
            };

            const originalNode = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Identifier", value: "$foo" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-windmill" },
                        count: { type: "Identifier", value: "$foo" }
                    }
                ]
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.Trigger> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    count: defNode.body
                }),
                actions: [
                    from(originalNode.actions[0], {
                        count: defNode.body
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should validate trigger ID type", () => {
            const defNode: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "String", value: "123" }
            };

            const originalNode: Parser.Trigger = {
                type: "Trigger",
                condition: {
                    type: { type: "Identifier", value: "Built" },
                    id: { type: "Identifier", value: "city-windmill" },
                    count: { type: "Identifier", value: "$foo" }
                },
                actions: [
                    {
                        type: { type: "Identifier", value: "Build" },
                        id: { type: "Identifier", value: "city-windmill" },
                        count: { type: "Identifier", value: "$foo" }
                    }
                ]
            };

            const { errors } = inlineReferences([defNode, originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Number expected, got String");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.count);
        });
    });
});
