import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { inlineReferences as inlineReferencesImpl } from "$lib/core/dsl/compiler/inlineReferences";

import type * as Parser from "$lib/core/dsl/model/0";

const inlineReferences = (nodes: Parser.Statement[]) => processStatements(nodes, inlineReferencesImpl);

describe("Compiler", () => {
    describe("Parameterized expression definitions", () => {
        it("should instantiate definitions with parameters", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Expression",
                    operator: ">",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Placeholder" }
                        },
                        { type: "Number", value: 123 }
                    ]
                },
                parameterized: true
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

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    ...defNode.body,
                    args: [
                        from(defNode.body.args[0], {
                            key: originalNode.value.key
                        }),
                        defNode.body.args[1]
                    ]
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should replace all placeholders", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Expression",
                    operator: "<",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Placeholder" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceStorage" },
                            key: { type: "Placeholder" }
                        }
                    ]
                },
                parameterized: true
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

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    ...defNode.body,
                    args: [
                        from(defNode.body.args[0], {
                            key: originalNode.value.key
                        }),
                        from(defNode.body.args[1], {
                            key: originalNode.value.key
                        })
                    ]
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references with definitions recursively", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Placeholder" }
                },
                parameterized: true
            };

            const defNode2 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "bar" },
                body: {
                    type: "Expression",
                    operator: ">",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "$foo" },
                            key: { type: "Placeholder" }
                        },
                        { type: "Number", value: 123 }
                    ]
                },
                parameterized: true
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "$bar" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode1,
                <Parser.ExpressionDefinition> defNode2,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    ...defNode2.body,
                    args: [
                        from(defNode2.body.args[0], {
                            ...defNode1.body,
                            key: originalNode.value.key
                        }),
                        defNode2.body.args[1]
                    ]
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should instantiate definitions with parameter packs as fold expressions", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Expression",
                    operator: ">",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Placeholder" }
                        },
                        { type: "Number", value: 123 }
                    ]
                },
                parameterized: true
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "$foo" },
                    key: {
                        type: "Fold",
                        operator: "or",
                        arg: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "Copper" },
                                { type: "Identifier", value: "Stone" },
                            ]
                        }
                    }
                }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    type: "Fold",
                    operator: "or",
                    arg: from(originalNode.value.key.arg, {
                        values: [
                            from(defNode.body, {
                                args: [
                                    from(defNode.body.args[0], {
                                        key: originalNode.value.key.arg.values[0]
                                    }),
                                    defNode.body.args[1]
                                ]
                            }),
                            from(defNode.body, {
                                args: [
                                    from(defNode.body.args[0], {
                                        key: originalNode.value.key.arg.values[1]
                                    }),
                                    defNode.body.args[1]
                                ]
                            })
                        ]
                    })
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should instantiate definitions with parameter packs as fold expressions recursively", () => {
            const defNode1 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Placeholder" }
                },
                parameterized: true
            };

            const defNode2 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "bar" },
                body: {
                    type: "Expression",
                    operator: ">",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "$foo" },
                            key: { type: "Placeholder" }
                        },
                        { type: "Number", value: 123 }
                    ]
                },
                parameterized: true
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "$bar" },
                    key: {
                        type: "Fold",
                        operator: "or",
                        arg: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "Copper" },
                                { type: "Identifier", value: "Stone" },
                            ]
                        }
                    }
                }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode1,
                <Parser.ExpressionDefinition> defNode2,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    type: "Fold",
                    operator: "or",
                    arg: from (originalNode.value.key.arg, {
                        values: [
                            from(defNode2.body, {
                                args: [
                                    from(defNode2.body.args[0], {
                                        ...defNode1.body,
                                        key: originalNode.value.key.arg.values[0]
                                    }),
                                    defNode2.body.args[1]
                                ]
                            }),
                            from(defNode2.body, {
                                args: [
                                    from(defNode2.body.args[0], {
                                        ...defNode1.body,
                                        key: originalNode.value.key.arg.values[1]
                                    }),
                                    defNode2.body.args[1]
                                ]
                            })
                        ]
                    })
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should instantiate definitions with parameter packs from other variables", () => {
            const defNode1 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "List",
                    values: [
                        { type: "Identifier", value: "Copper" },
                        { type: "Identifier", value: "Stone" },
                    ]
                },
                parameterized: false
            };

            const defNode2 = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "bar" },
                body: {
                    type: "Expression",
                    operator: ">",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Placeholder" }
                        },
                        { type: "Number", value: 123 }
                    ]
                },
                parameterized: true
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "$bar" },
                    key: { type: "Identifier", value: "$foo" }
                }
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode1,
                <Parser.ExpressionDefinition> defNode2,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    type: "Expression",
                    operator: ">",
                    args: [
                        from(defNode2.body.args[0], {
                            key: defNode1.body
                        }),
                        defNode2.body.args[1]
                    ]
                })
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on missing arguments", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourcesDemanded" },
                    key: { type: "Placeholder" }
                },
                parameterized: true
            };

            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "$foo" }
            };

            const { errors } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingAssignment> originalNode
            ]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Missing arguments for 'foo'");
            expect(errors[0].offendingEntity).toBe(originalNode.value);
        });

        it("should throw on unused parameters", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourcesDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                },
                parameterized: true
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Definition is parameterized but no placeholders were found inside the body");
            expect(errors[0].offendingEntity).toBe(defNode);
        });

        it("should throw if used as a statement", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourcesDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const originalNode = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$foo" },
                args: []
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition, originalNode as Parser.FunctionCall]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expressions cannot appear outside of a statement");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });
    });
});
