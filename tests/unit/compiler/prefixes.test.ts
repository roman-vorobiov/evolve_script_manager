import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf } from "./fixture";
import { resolvePrefixes as resolvePrefixesImpl } from "$lib/core/dsl/compiler/prefixes";

import type * as Parser from "$lib/core/dsl/model/4";

const resolvePrefixes = (node: Parser.Statement) => processStatement(node, resolvePrefixesImpl);

describe("Compiler", () => {
    describe("Prefixes", () => {
        it("should resolve setting prefixes in setting targets", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Identifier", value: "Copper" }
                },
                value: { type: "Boolean", value: true }
            };

            const { nodes, from } = resolvePrefixes(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                setting: from(originalNode.setting.key, { value: "sellCopper" })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on invalid prefixes inside setting targets", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "hello" },
                    key: { type: "Identifier", value: "Copper" }
                },
                value: { type: "Boolean", value: true }
            };

            const { errors } = resolvePrefixes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'hello' is not a valid setting prefix");
            expect(errors[0].offendingEntity).toBe(originalNode.setting.base);
        });

        it("should throw on incompatible suffixes inside setting targets", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: { type: "Identifier", value: "Bolognium" }
                },
                value: { type: "Boolean", value: true }
            };

            const { errors } = resolvePrefixes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'Bolognium' is not a valid resource for AutoSell");
            expect(errors[0].offendingEntity).toBe(originalNode.setting.key);
        });

        it("should throw on invalid suffixes inside setting targets", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "AutoSell" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Bolognium" }
                    }
                },
                value: { type: "Boolean", value: true }
            };

            const { errors } = resolvePrefixes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected");
            expect(errors[0].offendingEntity).toBe(originalNode.setting.key);
        });

        it("should resolve setting prefixes in setting values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                }
            };

            const { nodes, from } = resolvePrefixes(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    key: from(originalNode.value.key.key, { value: "sellCopper" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve setting prefixes in conditions", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                }
            };

            const { nodes, from } = resolvePrefixes(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    key: from(originalNode.condition.key.key, { value: "sellCopper" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve setting prefixes in setting shift conditions", () => {
            const originalNode = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "hello" },
                values: [
                    { type: "String", value: "bye" }
                ],
                operator: "<<",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                }
            };

            const { nodes, from } = resolvePrefixes(originalNode as Parser.SettingShift);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    key: from(originalNode.condition.key.key, { value: "sellCopper" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve setting prefixes in condition blocks", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                },
                body: []
            };

            const { nodes, from } = resolvePrefixes(originalNode as Parser.ConditionBlock);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    key: from(originalNode.condition.key.key, { value: "sellCopper" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should ignore other prefixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { nodes } = resolvePrefixes(originalNode as Parser.SettingAssignment);

            expect(nodes.length).toEqual(1);
            expect(nodes[0]).toBe(originalNode);
        });

        it("should throw on invalid other prefixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                }
            };

            const { errors } = resolvePrefixes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.key);
        });
    });
});
