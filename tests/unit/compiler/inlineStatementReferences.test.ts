import { describe, it, expect } from "vitest";
import { processStatements, valuesOf, originsOf } from "./fixture";
import { inlineReferences as inlineReferencesImpl } from "$lib/core/dsl/compiler/inlineReferences";

import type * as Parser from "$lib/core/dsl/model/0";

const inlineReferences = (nodes: Parser.Statement[]) => processStatements(nodes, inlineReferencesImpl);

describe("Compiler", () => {
    describe("Functions", () => {
        it("should inline all non-definition statements", () => {
            const defNode = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [],
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Boolean", value: true }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "bye" },
                        value: { type: "Boolean", value: true }
                    },
                ]
            };

            const originalNode = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$foo" },
                args: []
            };

            const { nodes } = inlineReferences([
                <Parser.StatementDefinition> defNode,
                <Parser.FunctionCall> originalNode
            ]);
            expect(nodes.length).toEqual(2);

            expect(nodes[0]).toBe(defNode.body[0]);
            expect(nodes[1]).toBe(defNode.body[1]);
        });

        it("should accept parameters", () => {
            const defNode = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "fn" },
                params: [
                    { type: "Identifier", value: "foo" },
                    { type: "Identifier", value: "bar" },
                    { type: "Identifier", value: "baz" },
                ],
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "aaa" },
                        value: { type: "Identifier", value: "$foo" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "bbb" },
                        value: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "ResourceDemanded" },
                            key: { type: "Identifier", value: "$bar" }
                        }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "ccc" },
                        value: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "SettingCurrent" },
                            key: { type: "Identifier", value: "$baz" }
                        }
                    }
                ]
            };

            const originalNode = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$fn" },
                args: [
                    { type: "Number", value: 123 },
                    {
                        type: "List",
                        values: [
                            { type: "Identifier", value: "Stone" },
                            { type: "Identifier", value: "Coal" }
                        ]
                    },
                    {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoSell" },
                        key: { type: "Identifier", value: "Copper" }
                    }
                ]
            };

            const { nodes, from } = inlineReferences([
                <Parser.StatementDefinition> defNode,
                <Parser.FunctionCall> originalNode
            ]);
            expect(nodes.length).toEqual(3);

            {
                const expectedNode = from(defNode.body[0], {
                    value: originalNode.args[0]
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(defNode.body[1], {
                    value: from(defNode.body[1].value, {
                        key: originalNode.args[1]
                    })
                });

                expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
            }
            {
                const expectedNode = from(defNode.body[2], {
                    value: from(defNode.body[2].value, {
                        key: originalNode.args[2]
                    })
                });

                expect(valuesOf(nodes[2])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[2])).toEqual(originsOf(expectedNode));
            }
        });

        it("should use definition's scope", () => {
            const defNode1 = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [],
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Identifier", value: "$baz" }
                    }
                ]
            };

            const defNode2 = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "bar" },
                params: [],
                body: [
                    {
                        type: "ExpressionDefinition",
                        name: { type: "Identifier", value: "baz" },
                        body: { type: "Number", value: 123 },
                        parameterized: false
                    },
                    {
                        type: "FunctionCall",
                        name: { type: "Identifier", value: "$foo" },
                        args: []
                    }
                ]
            };

            const originalNode = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$bar" },
                args: []
            };

            const { errors } = inlineReferences([
                <Parser.StatementDefinition> defNode1,
                <Parser.StatementDefinition> defNode2,
                <Parser.FunctionCall> originalNode
            ]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'baz' is not defined");
            expect(errors[0].offendingEntity).toBe(defNode1.body[0].value);
        });

        it("should throw on unknown invalid function names", () => {
            const originalNode: Parser.FunctionCall = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "foo" },
                args: []
            };

            const { errors } = inlineReferences([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown identifier 'foo'");
            expect(errors[0].offendingEntity).toBe(originalNode.name);
        });

        it("should throw on unknown unknown function names", () => {
            const originalNode: Parser.FunctionCall = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$foo" },
                args: []
            };

            const { errors } = inlineReferences([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("'foo' is not defined");
            expect(errors[0].offendingEntity).toBe(originalNode.name);
        });

        it("should warn on redefinition", () => {
            const defNode1: Parser.ExpressionDefinition = {
                type: "ExpressionDefinition",
                name: { type: "Identifier", value: "foo" },
                body: { type: "Number", value: 123 },
                parameterized: false
            };

            const defNode2: Parser.StatementDefinition = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [],
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 },
                    }
                ]
            };

            const { warnings } = inlineReferences([defNode1, defNode2]);
            expect(warnings.length).toEqual(1);

            expect(warnings[0].message).toEqual("Redefinition of 'foo'");
            expect(warnings[0].offendingEntity).toBe(defNode2.name);
        });

        it("should throw on statement definition used inside an expression", () => {
            const defNode = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [],
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 },
                    }
                ]
            };

            const originalNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "$foo" }
            };

            const { errors } = inlineReferences([defNode as Parser.StatementDefinition, originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Statements cannot appear inside expressions");
            expect(errors[0].offendingEntity).toBe(originalNode.value);
        });

        it("should throw on mismatched number of arguments", () => {
            const defNode = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [
                    { type: "Identifier", value: "bar" },
                    { type: "Identifier", value: "baz" },
                ],
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "hello" },
                        value: { type: "Number", value: 123 },
                    }
                ]
            };

            const originalNode: Parser.FunctionCall = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$foo" },
                args: [
                    { type: "String", value: "hello" }
                ]
            };

            const { errors } = inlineReferences([defNode as Parser.StatementDefinition, originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Expected 2 arguments, got 1");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });

        it("should throw on self recursion", () => {
            const defNode = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [],
                body: [
                    {
                        type: "FunctionCall",
                        name: { type: "Identifier", value: "$foo" },
                        args: []
                    }
                ]
            };

            const originalNode: Parser.FunctionCall = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$foo" },
                args: []
            };

            const { errors } = inlineReferences([defNode as Parser.StatementDefinition, originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Recursion is not allowed");
            expect(errors[0].offendingEntity).toBe(defNode.body[0]);
        });

        it("should throw on circular recursion", () => {
            const defNode1 = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [],
                body: [
                    {
                        type: "FunctionCall",
                        name: { type: "Identifier", value: "$bar" },
                        args: []
                    }
                ]
            };

            const defNode2 = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "bar" },
                params: [],
                body: [
                    {
                        type: "FunctionCall",
                        name: { type: "Identifier", value: "$foo" },
                        args: []
                    }
                ]
            };

            const originalNode: Parser.FunctionCall = {
                type: "FunctionCall",
                name: { type: "Identifier", value: "$foo" },
                args: []
            };

            const { errors } = inlineReferences([
                <Parser.StatementDefinition> defNode1,
                <Parser.StatementDefinition> defNode2,
                originalNode
            ]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Recursion is not allowed");
            expect(errors[0].offendingEntity).toBe(defNode2.body[0]);
        });

        it("should throw on parameter duplication", () => {
            const defNode = {
                type: "StatementDefinition",
                name: { type: "Identifier", value: "foo" },
                params: [
                    { type: "Identifier", value: "bar" },
                    { type: "Identifier", value: "bar" }
                ],
                body: []
            };

            const { errors } = inlineReferences([defNode as Parser.StatementDefinition]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Duplicate identifier 'bar'");
            expect(errors[0].offendingEntity).toBe(defNode.params[1]);
        });
    });
});
