import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf } from "./fixture";
import { resolvePlaceholders as resolvePlaceholdersImpl } from "$lib/core/dsl/compiler/placeholders";

import type * as Parser from "$lib/core/dsl/model/3";

const resolvePlaceholders = (node: Parser.Statement) => processStatement(node, resolvePlaceholdersImpl);

describe("Compiler", () => {
    describe("Placeholders", () => {
        it("should throw on unresolveded placeholders inside condition targets", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Placeholder" }
                },
                value: { type: "Boolean", value: true },
            };

            const { errors } = resolvePlaceholders(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(originalNode.setting.key);
        });

        it("should resolve placeholders in setting values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Identifier", value: "Copper" }
                },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Placeholder" }
                }
            };

            const { nodes, from } = resolvePlaceholders(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    key: originalNode.setting.key
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve nested placeholders in setting values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Identifier", value: "Copper" }
                },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: { type: "Placeholder" }
                    }
                }
            };

            const { nodes, from } = resolvePlaceholders(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    key: from(originalNode.value.key, {
                        key: originalNode.setting.key
                    })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on unresolveded placeholders inside setting values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Placeholder" }
                }
            };

            const { errors } = resolvePlaceholders(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(originalNode.value.key);
        });

        it("should resolve placeholders in conditions", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Identifier", value: "Copper" }
                },
                value: { type: "Boolean", value: true },
                condition: {
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
                }
            };

            const { nodes, from } = resolvePlaceholders(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    args: [
                        from(originalNode.condition.args[0], {
                            key: originalNode.setting.key
                        }),
                        from(originalNode.condition.args[1], {
                            key: originalNode.setting.key
                        })
                    ]
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on unresolveded placeholders inside conditions", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: "<",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceStorage" },
                            key: { type: "Placeholder" }
                        }
                    ]
                }
            };

            const { errors } = resolvePlaceholders(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[1].key);
        });

        it("should throw on unresolveded placeholders inside setting shift conditions", () => {
            const originalNode = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "hello" },
                values: [
                    { type: "String", value: "bye" }
                ],
                operator: "<<",
                condition: {
                    type: "Expression",
                    operator: "<",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceStorage" },
                            key: { type: "Placeholder" }
                        }
                    ]
                }
            };

            const { errors } = resolvePlaceholders(originalNode as Parser.SettingShift);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[1].key);
        });

        it("should throw on unresolveded placeholders inside condition blocks", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Expression",
                    operator: "<",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceStorage" },
                            key: { type: "Placeholder" }
                        }
                    ]
                },
                body: []
            };

            const { errors } = resolvePlaceholders(originalNode as Parser.ConditionBlock);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Placeholder used without the context to resolve it");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[1].key);
        });
    });
});
