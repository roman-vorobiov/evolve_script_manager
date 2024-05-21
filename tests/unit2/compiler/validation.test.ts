import { describe, it, expect } from "vitest";
import { getExcepion } from "./fixture";
import { validateTypes as validateTypesImpl, Validator } from "$lib/core/dsl2/compiler/validation";
import { ParseError } from "$lib/core/dsl2/model";

import type * as Parser from "$lib/core/dsl2/model/6";

const processExpression = (node: Parser.Expression) => new Validator().visit(node);

const validateTypes = (node: Parser.Statement) => validateTypesImpl([node]);

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

        it("should throw on unknown settings", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Boolean", value: true }
            };

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Unknown setting ID 'hello'");
                expect(error.offendingEntity).toBe(originalNode.setting);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Unknown identifier");
                expect(error.offendingEntity).toBe(originalNode.condition.base);
            }
        });

        it("should throw on unknown suffixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "hello" }
                }
            };

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("'hello' is not a valid resource");
                expect(error.offendingEntity).toBe(originalNode.condition.key);
            }
        });

        it("should throw on wrong value types", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "sellCopper" },
                value: { type: "Number", value: 123 }
            };

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected boolean, got number");
                expect(error.offendingEntity).toBe(originalNode.value);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected boolean, got number");
                expect(error.offendingEntity).toBe(originalNode.condition);
            }
        });

        it("should throw on wrong condition types in blocks", () => {
            const originalNode = {
                type: "ConditionPush",
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceQuantity" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected boolean, got number");
                expect(error.offendingEntity).toBe(originalNode.condition);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected string, got number");
                expect(error.offendingEntity).toBe(originalNode.condition.args[1]);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected boolean, got string");
                expect(error.offendingEntity).toBe(originalNode.condition.args[1]);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected boolean, got string");
                expect(error.offendingEntity).toBe(originalNode.condition.args[0]);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected number, got boolean");
                expect(error.offendingEntity).toBe(originalNode.condition.args[0]);
            }
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

            const error = getExcepion(() => validateTypes(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Expected number, got boolean");
                expect(error.offendingEntity).toBe(originalNode.condition.args[0]);
            }
        });
    });
});
