import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { inlineReferences as inlineReferencesImpl } from "$lib/core/dsl/compiler/inlineReferences";

import type * as Parser from "$lib/core/dsl/model/0";

const inlineReferences = (nodes: Parser.Statement[]) => processStatements(nodes, inlineReferencesImpl);

describe("Compiler", () => {
    describe("Variables", () => {
        describe("Parameters", () => {
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

            it("should instantiate definitions with parameter packs as lists", () => {
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
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "Copper" },
                                { type: "Identifier", value: "Stone" },
                            ]
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
                        type: "List",
                        fold: originalNode.value.key.fold,
                        values: [
                            from(defNode.body, {
                                args: [
                                    from(defNode.body.args[0], {
                                        key: originalNode.value.key.values[0]
                                    }),
                                    defNode.body.args[1]
                                ]
                            }),
                            from(defNode.body, {
                                args: [
                                    from(defNode.body.args[0], {
                                        key: originalNode.value.key.values[1]
                                    }),
                                    defNode.body.args[1]
                                ]
                            })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should instantiate definitions with parameter packs as lists recursively", () => {
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
                        key: {
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "Copper" },
                                { type: "Identifier", value: "Stone" },
                            ]
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
                        type: "List",
                        fold: originalNode.value.key.fold,
                        values: [
                            from(defNode2.body, {
                                args: [
                                    from(defNode2.body.args[0], {
                                        ...defNode1.body,
                                        key: originalNode.value.key.values[0]
                                    }),
                                    defNode2.body.args[1]
                                ]
                            }),
                            from(defNode2.body, {
                                args: [
                                    from(defNode2.body.args[0], {
                                        ...defNode1.body,
                                        key: originalNode.value.key.values[1]
                                    }),
                                    defNode2.body.args[1]
                                ]
                            })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should instantiate definitions with parameter packs from other variables as lists", () => {
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
                        type: "List",
                        values: [
                            from(defNode2.body, {
                                args: [
                                    from(defNode2.body.args[0], {
                                        key: defNode1.body.values[0]
                                    }),
                                    defNode2.body.args[1]
                                ]
                            }),
                            from(defNode2.body, {
                                args: [
                                    from(defNode2.body.args[0], {
                                        key: defNode1.body.values[1]
                                    }),
                                    defNode2.body.args[1]
                                ]
                            })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should throw on wildcards as arguments", () => {
                const defNode = {
                    type: "ExpressionDefinition",
                    name: { type: "Identifier", value: "foo" },
                    body: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "AutoSell" },
                            key: { type: "Placeholder" }
                        }
                    },
                    parameterized: true
                };

                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "$foo" },
                        key: { type: "Wildcard" }
                    }
                };

                const { errors } = inlineReferences([
                    <Parser.ExpressionDefinition> defNode,
                    <Parser.SettingAssignment> originalNode
                ]);
                expect(errors.length).toEqual(1);

                expect(errors[0].message).toEqual("Wildcards are only supported for setting prefixes");
                expect(errors[0].offendingEntity).toBe(originalNode.value.key);
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
        });

        it("should repace references with definitions recursively", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 },
                parameterized: false
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
                },
                parameterized: false
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
                value: from(originalNode.value, {
                    ...defNode2.body,
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
                },
                parameterized: false
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
                body: { type: "Number", value: 123 },
                parameterized: false
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
                body: { type: "Number", value: 123 },
                parameterized: false
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
                },
                parameterized: false
            };

            const { errors } = inlineReferences([defNode as Parser.ExpressionDefinition]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(defNode.body.key);
        });

        it("should be limited to a lexical scope", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: { type: "Eval", value: "hello" },
                body: [
                    {
                        type: "ExpressionDefinition",
                        name: { type: "Identifier", value: "foo" },
                        body: { type: "Number", value: 123 },
                        parameterized: false
                    },
                    {
                        type: "ConditionBlock",
                        condition: { type: "Eval", value: "hello" },
                        body: [
                            {
                                type: "ExpressionDefinition",
                                name: { type: "Identifier", value: "foo" },
                                body: { type: "Number", value: 456 },
                                parameterized: false
                            },
                            {
                                type: "SettingAssignment",
                                setting: { type: "Identifier", value: "hello" },
                                value: { type: "Identifier", value: "$foo" }
                            }
                        ]
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Identifier", value: "$foo" }
                    }
                ]
            };

            const { warnings, nodes, from } = inlineReferences([originalNode as Parser.ConditionBlock]);
            expect(nodes.length).toEqual(1);

            expect(warnings[0].message).toEqual("Redefinition of 'foo'");
            expect(warnings[0].offendingEntity).toBe((originalNode.body[1].body as any)[0]);
            expect(warnings[0].details.length).toEqual(1);
            expect(warnings[0].details[0][0]).toEqual("Previously defined here");
            expect(warnings[0].details[0][1]).toBe(originalNode.body[0]);

            const expectedNode = from(originalNode, {
                body: [
                    from(originalNode.body[1], {
                        body: [
                            from((originalNode.body[1].body as any)[1], {
                                value: (originalNode.body[1].body as any)[0].body
                            })
                        ]
                    }),
                    from(originalNode.body[2], {
                        value: originalNode.body[0].body
                    })
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on redefinitions in the same scope", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 },
                parameterized: false
            };

            const defNode2: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 456 },
                parameterized: false
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
            const defNode: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 },
                parameterized: false
            };

            const originalNode: Parser.ConditionBlock = {
                type: "ConditionBlock",
                condition: { type: "Identifier", value: "$foo" },
                body: []
            };

            const { nodes, from } = inlineReferences([defNode, originalNode]);
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
                body: { type: "Identifier", value: "sellCopper" },
                parameterized: false
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
                body: { type: "Identifier", value: "Copper" },
                parameterized: false
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
                body: { type: "Number", value: 123 },
                parameterized: false
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
                },
                parameterized: false
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
                body: { type: "Identifier", value: "sellCopper" },
                parameterized: false
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
                body: { type: "Identifier", value: "sellCopper" },
                parameterized: false
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "$foo" },
                values: [
                    { type: "String", value: "123" }
                ]
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
                body: { type: "Number", value: 123 },
                parameterized: false
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "$foo" },
                values: [
                    { type: "String", value: "456" }
                ]
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
                body: { type: "Identifier", value: "sellCopper" },
                parameterized: false
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "hello" },
                values: [
                    { type: "Identifier", value: "$foo" }
                ]
            };

            const { nodes, from } = inlineReferences([
                <Parser.ExpressionDefinition> defNode,
                <Parser.SettingShift> originalNode
            ]);
            expect(nodes.length).toEqual(1);

            const expectedNode = from(originalNode, {
                values: [
                    defNode.body
                ]
            });

            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should repace references inside setting shift conditions", () => {
            const defNode = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Identifier", value: "sellCopper" },
                parameterized: false
            };

            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "hello" },
                values: [
                    { type: "String", value: "asd" }
                ],
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
                body: { type: "Identifier", value: "sellCopper" },
                parameterized: false
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
                body: { type: "Number", value: 123 },
                parameterized: false
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
                body: { type: "Number", value: 123 },
                parameterized: false
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

        it("should validate trigger count type", () => {
            const defNode: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "String", value: "123" },
                parameterized: false
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
