import { describe, it, expect } from "vitest";
import { processExpression as processExpressionImpl, processStatement, valuesOf, originsOf, getExcepion } from "./fixture";
import { resolveAliases as resolveAliasesImpl, AliasResolver } from "$lib/core/dsl/compiler/aliases";
import { CompileError } from "$lib/core/dsl/model";

import type * as Parser from "$lib/core/dsl/model/5";

const processExpression = (node: Parser.Expression) => {
    return processExpressionImpl(node, (sourceMap) => new AliasResolver(sourceMap));
}

const resolveAliases = (node: Parser.Statement) => {
    return processStatement(node, resolveAliasesImpl);
}

describe("Compiler", () => {
    describe("Aliases", () => {
        describe("Expressions", () => {
            it("should resolve race aliases", () => {
                const originalNode: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "RacePillared" },
                    key: { type: "Identifier", value: "Imitation" }
                };

                const { node, from } = processExpression(originalNode);

                const expectedNode = from(originalNode, {
                    key: from(originalNode.key, { value: "srace" })
                });

                expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                expect(originsOf(node)).toEqual(originsOf(expectedNode));
            });

            it("should ignore non-aliased race", () => {
                const originalNode: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "RacePillared" },
                    key: { type: "Identifier", value: "Sludge" }
                };

                const { node } = processExpression(originalNode);

                expect(node).toBe(originalNode);
            });

            it("should resolve queue aliases", () => {
                const originalNode: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "Queue" },
                    key: { type: "Identifier", value: "Research" }
                };

                const { node, from } = processExpression(originalNode);

                const expectedNode = from(originalNode, {
                    key: from(originalNode.key, { value: "r_queue" })
                });

                expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                expect(originsOf(node)).toEqual(originsOf(expectedNode));
            });

            it("should resolve 'Other' prefixes", () => {
                const originalNode: Parser.Identifier = {
                    type: "Identifier",
                    value: "SatelliteCost"
                };

                const { node, from } = processExpression(originalNode);

                const expectedNode = from(originalNode, {
                    type: "Subscript",
                    base: from(originalNode, { type: "Identifier", value: "Other" }),
                    key: from(originalNode, { type: "Identifier", value: "satcost" })
                });

                expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                expect(originsOf(node)).toEqual(originsOf(expectedNode));
            });

            it("should throw on unknown identifiers", () => {
                const originalNode: Parser.Identifier = {
                    type: "Identifier",
                    value: "hello"
                };

                const error = getExcepion(() => processExpression(originalNode));
                expect(error).toBeInstanceOf(CompileError);
                if (error instanceof CompileError) {
                    expect(error.message).toEqual("Unexpected identifier 'hello'");
                    expect(error.offendingEntity).toBe(originalNode);
                }
            });

            it("should throw on unknown suffixes", () => {
                const originalNode: Parser.Subscript = {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "hello" }
                };

                const error = getExcepion(() => processExpression(originalNode));
                expect(error).toBeInstanceOf(CompileError);
                if (error instanceof CompileError) {
                    expect(error.message).toEqual("'hello' is not a valid resource");
                    expect(error.offendingEntity).toBe(originalNode.key);
                }
            });
        });

        describe("Statements", () => {
            it("should resolve aliases in setting values", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "RacePillared" },
                        key: { type: "Identifier", value: "Imitation" }
                    }
                };

                const { nodes, from } = resolveAliases(originalNode as Parser.SettingAssignment);

                const expectedNode = from(originalNode, {
                    value: from(originalNode.value, {
                        key: from(originalNode.value.key, { value: "srace" })
                    })
                });

                expect(nodes.length).toEqual(1);
                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should resolve aliases in setting conditions", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: { type: "String", value: "bye" },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "RacePillared" },
                        key: { type: "Identifier", value: "Imitation" }
                    }
                };

                const { nodes, from } = resolveAliases(originalNode as Parser.SettingAssignment);

                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        key: from(originalNode.condition.key, { value: "srace" })
                    })
                });

                expect(nodes.length).toEqual(1);
                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should resolve aliases in setting shift conditions", () => {
                const originalNode = {
                    type: "SettingShift",
                    setting: { type: "Identifier", value: "hello" },
                    values: [
                        { type: "String", value: "bye" }
                    ],
                    operator: "<<",
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "RacePillared" },
                        key: { type: "Identifier", value: "Imitation" }
                    }
                };

                const { nodes, from } = resolveAliases(originalNode as Parser.SettingShift);

                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        key: from(originalNode.condition.key, { value: "srace" })
                    })
                });

                expect(nodes.length).toEqual(1);
                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should resolve aliases in condition block conditions", () => {
                const originalNode = {
                    type: "ConditionBlock",
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "RacePillared" },
                        key: { type: "Identifier", value: "Imitation" }
                    },
                    body: []
                };

                const { nodes, from } = resolveAliases(originalNode as Parser.ConditionBlock);

                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        key: from(originalNode.condition.key, { value: "srace" })
                    })
                });

                expect(nodes.length).toEqual(1);
                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });

            it("should resolve aliases in condition block body", () => {
                const originalNode = {
                    type: "ConditionBlock",
                    condition: { type: "Boolean", value: true },
                    body: [
                        {
                            type: "SettingAssignment",
                            setting: { type: "Identifier", value: "hello" },
                            value: {
                                type: "Subscript",
                                base: { type: "Identifier", value: "RacePillared" },
                                key: { type: "Identifier", value: "Imitation" }
                            }
                        }
                    ]
                };

                const { nodes, from } = resolveAliases(originalNode as Parser.ConditionBlock);

                const expectedNode = from(originalNode, {
                    body: [
                        from(originalNode.body[0], {
                            value: from(originalNode.body[0].value, {
                                key: from(originalNode.body[0].value.key, { value: "srace" })
                            })
                        })
                    ]
                });

                expect(nodes.length).toEqual(1);
                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
            });
        });
    });
});
