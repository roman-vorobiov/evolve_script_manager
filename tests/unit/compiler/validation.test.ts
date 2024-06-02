import { describe, it, expect } from "vitest";
import { processStatement } from "./fixture";
import { validateTypes as validateTypesImpl, Validator } from "$lib/core/dsl/compiler/validation";

import type * as Parser from "$lib/core/dsl/model/6";

const processExpression = (node: Parser.Expression) => new Validator().visit(node);

const validateTypes = (node: Parser.Statement) => processStatement(node, validateTypesImpl);

describe("Compiler", () => {
    describe("Validation", () => {
        describe("Expression type deduction", () => {
            it("should deduce number", () => {
                const node: Parser.NumberLiteral = { type: "Number", value: 123 };

                expect(processExpression(node)).toEqual("number");
            });

            it("should deduce boolean", () => {
                const node: Parser.BooleanLiteral = { type: "Boolean", value: false };

                expect(processExpression(node)).toEqual("boolean");
            });

            it("should deduce string", () => {
                const node: Parser.StringLiteral = { type: "String", value: "123" };

                expect(processExpression(node)).toEqual("string");
            });

            it("should not deduce evals", () => {
                const node: Parser.EvalLiteral = { type: "Eval", value: "123" };

                expect(processExpression(node)).toEqual("unknown");
            });

            it("should deduce expression types (boolean)", () => {
                const node: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                };

                expect(processExpression(node)).toEqual("boolean");
            });

            it("should deduce expression types (numeric)", () => {
                const node: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Identifier", value: "Copper" }
                };

                expect(processExpression(node)).toEqual("number");
            });

            it("should deduce 'Other' expression types", () => {
                const node: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "Other" },
                    key: { type: "Identifier", value: "satcost" }
                };

                expect(processExpression(node)).toEqual("number");
            });

            it("should deduce 'SettingCurrent/Default' expression types (boolean)", () => {
                const node: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: { type: "Identifier", value: "sellCopper" }
                };

                expect(processExpression(node)).toEqual("boolean");
            });

            it("should deduce 'SettingCurrent/Default' expression types (numeric)", () => {
                const node: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: { type: "Identifier", value: "res_sell_r_Copper" }
                };

                expect(processExpression(node)).toEqual("number");
            });

            it("should deduce unary expression types", () => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: "not",
                    args: [
                        { type: "Boolean", value: true }
                    ]
                };

                expect(processExpression(node)).toEqual("boolean");
            });

            it.each(["==", "!="])("should deduce binary expression types (boolean) ('%s')", (op) => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "String", value: "true" },
                        { type: "String", value: "123" }
                    ]
                };

                expect(processExpression(node)).toEqual("boolean");
            });

            it.each(["and", "or"])("should deduce binary expression types (boolean) ('%s')", (op) => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "Boolean", value: true },
                        { type: "Boolean", value: false }
                    ]
                };

                expect(processExpression(node)).toEqual("boolean");
            });

            it.each(["<", "<=", ">", ">="])("should deduce binary expression types (boolean) ('%s')", (op) => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "Number", value: 0 },
                        { type: "Number", value: 123 }
                    ]
                };

                expect(processExpression(node)).toEqual("boolean");
            });

            it.each(["+", "-", "*", "/"])("should deduce binary expression types (numeric) ('%s')", (op) => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "Number", value: 0 },
                        { type: "Number", value: 123 }
                    ]
                };

                expect(processExpression(node)).toEqual("number");
            });
        });

        it("should throw on invalid targets for shifting", () => {
            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "prestigeType" },
                values: [
                    { type: "String", value: "mad" }
                ]
            };

            const { errors } = validateTypes(originalNode as Parser.SettingShift);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("List manipulation is only supported for 'logFilter', 'researchIgnore' and 'evolutionQueue'");
            expect(errors[0].offendingEntity).toBe(originalNode.setting);
        });

        it("should throw on unknown settings", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Boolean", value: true }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown setting ID 'hello'");
            expect(errors[0].offendingEntity).toBe(originalNode.setting);
        });

        it("should throw on unknown prefixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "hello" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown identifier");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.base);
        });

        it("should throw on wrong value types", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Number", value: 123 }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got number");
            expect(errors[0].offendingEntity).toBe(originalNode.value);
        });

        it("should throw on wrong condition types", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got number");
            expect(errors[0].offendingEntity).toBe(originalNode.condition);
        });

        it("should throw on wrong setting shift condition types", () => {
            const originalNode = {
                type: "SettingShift",
                operator: "<<",
                setting: { type: "Identifier", value: "logFilter" },
                values: [
                    { type: "String", value: "hello" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingShift);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got number");
            expect(errors[0].offendingEntity).toBe(originalNode.condition);
        });

        it("should throw on wrong condition types inside block condition", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Identifier", value: "Copper" }
                },
                body: []
            };

            const { errors } = validateTypes(originalNode as Parser.ConditionBlock);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got number");
            expect(errors[0].offendingEntity).toBe(originalNode.condition);
        });

        it("should throw on wrong condition types inside block body", () => {
            const originalNode = {
                type: "ConditionBlock",
                condition: { type: "Boolean", value: true },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "sellCopper" },
                        value: { type: "Boolean", value: true },
                        condition: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceQuantity" },
                            key: { type: "Identifier", value: "Copper" }
                        }
                    }
                ]
            };

            const { errors } = validateTypes(originalNode as Parser.ConditionBlock);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got number");
            expect(errors[0].offendingEntity).toBe(originalNode.body[0].condition);
        });

        it.each(["==", "!="])("should throw on mismatched expression types ('%s')", (op) => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "String", value: "hello" },
                        { type: "Number", value: 123 }
                    ]
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected string, got number");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[1]);
        });

        it.each(["and", "or"])("should throw on mismatched expression types ('%s')", (op) => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "Boolean", value: true },
                        { type: "String", value: "hello" }
                    ]
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got string");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[1]);
        });

        it.each(["not"])("should throw on mismatched expression types ('%s')", (op) => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "String", value: "hello" }
                    ]
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected boolean, got string");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[0]);
        });

        it.each(["<", "<=", ">", ">="])("should throw on mismatched expression types ('%s')", (op) => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "Boolean", value: true },
                        { type: "Number", value: 123 }
                    ]
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected number, got boolean");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[0]);
        });

        it.each(["+", "-", "*", "/"])("should throw on mismatched expression types ('%s')", (op) => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: op,
                    args: [
                        { type: "Boolean", value: true },
                        { type: "Number", value: 123 }
                    ]
                }
            };

            const { errors } = validateTypes(originalNode as Parser.SettingAssignment);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected number, got boolean");
            expect(errors[0].offendingEntity).toBe(originalNode.condition.args[0]);
        });
    });
});
