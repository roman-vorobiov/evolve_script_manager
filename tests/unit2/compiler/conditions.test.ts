import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf } from "./fixture";
import { flattenExpressions as flattenExpressionsImpl, toEvalString } from "$lib/core/dsl2/compiler/conditions";

import type * as Parser from "$lib/core/dsl2/model/7";

const flattenExpressions = (node: Parser.Statement) => processStatement(node, flattenExpressionsImpl)!;

describe("Compiler", () => {
    describe("Conditions", () => {
        describe("Eval conversion", () => {
            it("should convert numbers", () => {
                const node: Parser.NumberLiteral = { type: "Number", value: 123 };

                expect(toEvalString(node)).toEqual("123");
            });

            it("should convert boolean", () => {
                const node: Parser.BooleanLiteral = { type: "Boolean", value: false };

                expect(toEvalString(node)).toEqual("false");
            });

            it("should convert strings", () => {
                const node: Parser.StringLiteral = { type: "String", value: "hello" };

                expect(toEvalString(node)).toEqual("'hello'");
            });

            it("should convert evals", () => {
                const node: Parser.EvalLiteral = { type: "Eval", value: "hello" };

                expect(toEvalString(node)).toEqual("hello");
            });

            it("should convert subscripts", () => {
                const node: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "foo" },
                    key: { type: "Identifier", value: "bar" }
                };

                expect(toEvalString(node)).toEqual("_('foo', 'bar')");
            });

            it("should convert binary expressions", () => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "foo" },
                            key: { type: "Identifier", value: "aaa" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "bar" },
                            key: { type: "Identifier", value: "bbb" }
                        }
                    ]
                };

                expect(toEvalString(node)).toEqual("_('foo', 'aaa') && _('bar', 'bbb')");
            });

            it("should convert unary expressions", () => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: "not",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "foo" },
                            key: { type: "Identifier", value: "bar" }
                        }
                    ]
                };

                expect(toEvalString(node)).toEqual("!_('foo', 'bar')");
            });

            it("should convert nested expressions", () => {
                const node: Parser.CompoundExpression = {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Expression",
                            operator: "or",
                            args: [
                                {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "foo" },
                                    key: { type: "Identifier", value: "aaa" }
                                },
                                { type: "Eval", value: "hello" }
                            ]
                        },
                        {
                            type: "Expression",
                            operator: "not",
                            args: [
                                {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "bar" },
                                    key: { type: "Identifier", value: "bbb" }
                                }
                            ]
                        }
                    ]
                };

                expect(toEvalString(node)).toEqual("(_('foo', 'aaa') || (hello)) && !_('bar', 'bbb')");
            });
        });

        it("should preserve nullary expressions in values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { nodes } = flattenExpressions(originalNode as Parser.SettingAssignment);

            expect(nodes.length).toEqual(1);
            expect(nodes[0]).toBe(originalNode);
        });

        it("should simplify binary expressions in values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Stone" }
                        }
                    ]
                }
            };

            const { nodes, from } = flattenExpressions(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    type: "Eval",
                    value: "_('ResourceDemanded', 'Copper') && _('ResourceDemanded', 'Stone')"
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should preserve binary expressions in conditions (with constant values)", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Stone" }
                        }
                    ]
                }
            };

            const { nodes } = flattenExpressions(originalNode as Parser.SettingAssignment);

            expect(nodes.length).toEqual(1);
            expect(nodes[0]).toBe(originalNode);
        });

        it("should simplify binary expressions in conditions (with non-constant values)", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Eval", value: "hello" },
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Copper" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Stone" }
                        }
                    ]
                }
            };

            const { nodes, from } = flattenExpressions(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    type: "Eval",
                    value: "_('ResourceDemanded', 'Copper') && _('ResourceDemanded', 'Stone')"
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should flatten nested binary expressions in conditions", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Boolean", value: true },
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Expression",
                            operator: "and",
                            args: [
                                {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "ResourceDemanded" },
                                    key: { type: "Identifier", value: "Copper" }
                                },
                                {
                                    type: "Subscript",
                                    base: { type: "Identifier", value: "ResourceDemanded" },
                                    key: { type: "Identifier", value: "Stone" }
                                }
                            ]
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "Coal" }
                        }
                    ]
                }
            };

            const { nodes, from } = flattenExpressions(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    args: [
                        from(originalNode.condition.args[0], {
                            type: "Eval",
                            value: "_('ResourceDemanded', 'Copper') && _('ResourceDemanded', 'Stone')"
                        }),
                        originalNode.condition.args[1]
                    ]
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });
    });
});
