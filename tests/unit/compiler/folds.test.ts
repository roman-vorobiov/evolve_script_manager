import { describe, it, expect } from "vitest";
import { processExpression as processExpressionImpl, processStatement, valuesOf, originsOf, getExcepion } from "./fixture";
import { resolveFolds as resolveFoldsImpl, FoldResolver } from "$lib/core/dsl/compiler/folds";
import { CompileError } from "$lib/core/dsl/model";

import type * as Parser from "$lib/core/dsl/model/2";

const processExpression = (node: Parser.Expression) => {
    return processExpressionImpl(node, (sourceMap) => new FoldResolver(sourceMap));
}

const resolveFolds = (node: Parser.Statement) => {
    return processStatement(node, resolveFoldsImpl);
}

describe("Compiler", () => {
    describe("Folds", () => {
        describe("Common expression rules", () => {
            describe("Lists", () => {
                it.each(["or", "and"])("should fold lists of boolean expressions ('%s')", (fold) => {
                    const originalNode = {
                        type: "List",
                        fold,
                        values: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Iridium" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Alloy" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Aluminium" }
                            }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: fold,
                                args: [
                                    originalNode.values[0],
                                    originalNode.values[1]
                                ]
                            }),
                            originalNode.values[2]
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each(["or", "and"])("should not fold lists of non-boolean expressions ('%s')", (fold) => {
                    const originalNode = {
                        type: "List",
                        fold,
                        values: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceQuantity" },
                                key: { type: "Identifier", value: "Iridium" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceQuantity" },
                                key: { type: "Identifier", value: "Alloy" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceQuantity" },
                                key: { type: "Identifier", value: "Aluminium" }
                            }
                        ]
                    };

                    const { node } = processExpression(originalNode as Parser.Expression);

                    expect(node).toBe(originalNode);
                });

                it("should throw on multiple folds", () => {
                    const originalNode = {
                        type: "List",
                        fold: "and",
                        values: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "AutoBuyRatio" },
                                key: {
                                    type: "List",
                                    fold: "and",
                                    values: [
                                        { type: "Identifier", value: "Iridium" },
                                        { type: "Identifier", value: "Alloy" },
                                        { type: "Identifier", value: "Aluminium" },
                                    ]
                                }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "AutoSellRatio" },
                                key: {
                                    type: "List",
                                    fold: "and",
                                    values: [
                                        { type: "Identifier", value: "Iridium" },
                                        { type: "Identifier", value: "Alloy" },
                                        { type: "Identifier", value: "Aluminium" },
                                    ]
                                }
                            }
                        ]
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(CompileError);
                    if (error instanceof CompileError) {
                        expect(error.message).toEqual("Only one fold subexpression is allowed");
                        expect(error.offendingEntity).toBe(originalNode);
                    }
                });

                it("should throw on ambiguous folds", () => {
                    const originalNode = {
                        type: "List",
                        values: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Iridium" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Alloy" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "ResourceDemanded" },
                                key: { type: "Identifier", value: "Aluminium" }
                            }
                        ]
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(CompileError);
                    if (error instanceof CompileError) {
                        expect(error.message).toEqual("Ambiguous fold expression: use 'and' or 'or' instead of the last comma or use 'any of' or 'all of' before the list");
                        expect(error.offendingEntity).toBe(originalNode);
                    }
                });
            });

            describe("Subscripts", () => {
                it.each(["or", "and"])("should fold boolean subscripts ('%s')", (fold) => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            fold,
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: fold,
                                args: [
                                    from(originalNode, { key: originalNode.key.values[0] }),
                                    from(originalNode, { key: originalNode.key.values[1] })
                                ]
                            }),
                            from(originalNode, { key: originalNode.key.values[2] })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each(["or", "and"])("should use the explicit fold operator ('%s')", (fold) => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        },
                        explicitKeyFold: fold
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: fold,
                                args: [
                                    from(originalNode, { key: originalNode.key.values[0] }),
                                    from(originalNode, { key: originalNode.key.values[1] })
                                ]
                            }),
                            from(originalNode, { key: originalNode.key.values[2] })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each(["or", "and"])("should unroll non-boolean subscripts ('%s')", (fold) => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceQuantity" },
                        key: {
                            type: "List",
                            fold,
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "List",
                        fold,
                        values: [
                            from(originalNode, { key: originalNode.key.values[0] }),
                            from(originalNode, { key: originalNode.key.values[1] }),
                            from(originalNode, { key: originalNode.key.values[2] }),
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it("should deduce setting type (boolean)", () => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "List",
                            fold: "and",
                            values: [
                                { type: "Identifier", value: "buyIridium" },
                                { type: "Identifier", value: "buyAlloy" },
                                { type: "Identifier", value: "buyAluminium" },
                            ]
                        }
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: "and",
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: "and",
                                args: [
                                    from(originalNode, { key: originalNode.key.values[0] }),
                                    from(originalNode, { key: originalNode.key.values[1] })
                                ]
                            }),
                            from(originalNode, { key: originalNode.key.values[2] })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it("should deduce setting type (non-boolean)", () => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "List",
                            fold: "and",
                            values: [
                                { type: "Identifier", value: "res_buy_r_Iridium" },
                                { type: "Identifier", value: "res_buy_r_Alloy" },
                                { type: "Identifier", value: "res_buy_r_Aluminium" },
                            ]
                        }
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "List",
                        fold: "and",
                        values: [
                            from(originalNode, { key: originalNode.key.values[0] }),
                            from(originalNode, { key: originalNode.key.values[1] }),
                            from(originalNode, { key: originalNode.key.values[2] }),
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it("should throw on invalid settings", () => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "List",
                            fold: "and",
                            values: [
                                { type: "Identifier", value: "res_buy_r_Iridium" },
                                { type: "Identifier", value: "hello" },
                                { type: "Identifier", value: "res_buy_r_Aluminium" },
                            ]
                        }
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(CompileError);
                    if (error instanceof CompileError) {
                        expect(error.message).toEqual("Invalid setting");
                        expect(error.offendingEntity).toBe(originalNode.key.values[1]);
                    }
                });

                it("should throw on heterogeneous setting lists", () => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "List",
                            fold: "and",
                            values: [
                                { type: "Identifier", value: "res_buy_r_Iridium" },
                                { type: "Identifier", value: "buyAlloy" },
                                { type: "Identifier", value: "res_buy_r_Aluminium" },
                            ]
                        }
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(CompileError);
                    if (error instanceof CompileError) {
                        expect(error.message).toEqual("Only values of the same type are allowed to be in the same list");
                        expect(error.offendingEntity).toBe(originalNode.key);
                    }
                });

                it.each(["or", "and"])("should fold nested boolean subscripts ('%s')", (fold) => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "AutoBuy" },
                            key: {
                                type: "List",
                                fold,
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" },
                                ]
                            }
                        }
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: fold,
                                args: [
                                    from(originalNode, {
                                        key: from(originalNode.key, { key: originalNode.key.key.values[0] })
                                    }),
                                    from(originalNode, {
                                        key: from(originalNode.key, { key: originalNode.key.key.values[1] })
                                    })
                                ]
                            }),
                            from(originalNode, {
                                key: from(originalNode.key, { key: originalNode.key.key.values[2] })
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each(["or", "and"])("should unroll nested non-boolean subscripts ('%s')", (fold) => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "AutoBuyRatio" },
                            key: {
                                type: "List",
                                fold,
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" },
                                ]
                            }
                        }
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "List",
                        fold,
                        values: [
                            from(originalNode, {
                                key: from(originalNode.key, { key: originalNode.key.key.values[0] })
                            }),
                            from(originalNode, {
                                key: from(originalNode.key, { key: originalNode.key.key.values[1] })
                            }),
                            from(originalNode, {
                                key: from(originalNode.key, { key: originalNode.key.key.values[2] })
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it("should throw on invalid nested settings", () => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
                            type: "Subscript",
                            base: { type: "Identifier", value: "hello" },
                            key: {
                                type: "List",
                                fold: "and",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" },
                                ]
                            }
                        }
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(CompileError);
                    if (error instanceof CompileError) {
                        expect(error.message).toEqual("Invalid setting");
                        expect(error.offendingEntity).toBe(originalNode.key.base);
                    }
                });
            });

            describe("Expressions", () => {
                it.each(["or", "and"])("should always fold before 'not' ('%s')", (fold) => {
                    const originalNode = {
                        type: "Expression",
                        operator: "not",
                        args: [
                            {
                                type: "List",
                                fold,
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" }
                                ]
                            }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: fold,
                                args: originalNode.args[0].values
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each([
                    "+",
                    "-",
                    "*",
                    "/"
                ])("should apply the rhs operand to each element ('%s')", (op) => {
                    const originalNode = {
                        type: "Expression",
                        operator: op,
                        args: [
                            {
                                type: "List",
                                fold: "or",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" }
                                ]
                            },
                            { type: "Number", value: 123 }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "List",
                        fold: "or",
                        values: [
                            from(originalNode, {
                                args: [
                                    originalNode.args[0].values![0],
                                    originalNode.args[1]
                                ]
                            }),
                            from(originalNode, {
                                args: [
                                    originalNode.args[0].values![1],
                                    originalNode.args[1]
                                ]
                            }),
                            from(originalNode, {
                                args: [
                                    originalNode.args[0].values![2],
                                    originalNode.args[1]
                                ]
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each([
                    "+",
                    "-",
                    "*",
                    "/"
                ])("should apply the lhs operand to each element ('%s')", (op) => {
                    const originalNode = {
                        type: "Expression",
                        operator: op,
                        args: [
                            { type: "Number", value: 123 },
                            {
                                type: "List",
                                fold: "or",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" }
                                ]
                            }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "List",
                        fold: "or",
                        values: [
                            from(originalNode, {
                                args: [
                                    originalNode.args[0],
                                    originalNode.args[1].values![0]
                                ]
                            }),
                            from(originalNode, {
                                args: [
                                    originalNode.args[0],
                                    originalNode.args[1].values![1]
                                ]
                            }),
                            from(originalNode, {
                                args: [
                                    originalNode.args[0],
                                    originalNode.args[1].values![2]
                                ]
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each([
                    "and",
                    "or",
                    "<",
                    "<=",
                    ">",
                    ">=",
                    "=="
                ])("should apply the rhs operand to each element and fold ('%s')", (op) => {
                    const originalNode = {
                        type: "Expression",
                        operator: op,
                        args: [
                            {
                                type: "List",
                                fold: "or",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" }
                                ]
                            },
                            { type: "Number", value: 123 }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    from(originalNode, {
                                        args: [
                                            originalNode.args[0].values![0],
                                            originalNode.args[1]
                                        ]
                                    }),
                                    from(originalNode, {
                                        args: [
                                            originalNode.args[0].values![1],
                                            originalNode.args[1]
                                        ]
                                    })
                                ]
                            }),
                            from(originalNode, {
                                args: [
                                    originalNode.args[0].values![2],
                                    originalNode.args[1]
                                ]
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each([
                    "and",
                    "or",
                    "<",
                    "<=",
                    ">",
                    ">=",
                    "=="
                ])("should apply the lhs operand to each element and fold ('%s')", (op) => {
                    const originalNode = {
                        type: "Expression",
                        operator: op,
                        args: [
                            { type: "Number", value: 123 },
                            {
                                type: "List",
                                fold: "or",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" }
                                ]
                            }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    from(originalNode, {
                                        args: [
                                            originalNode.args[0],
                                            originalNode.args[1].values![0]
                                        ]
                                    }),
                                    from(originalNode, {
                                        args: [
                                            originalNode.args[0],
                                            originalNode.args[1].values![1]
                                        ]
                                    })
                                ]
                            }),
                            from(originalNode, {
                                args: [
                                    originalNode.args[0],
                                    originalNode.args[1].values![2]
                                ]
                            })
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toEqual(originsOf(expectedNode));
                });

                it.each(["and", "or"])("should unwrap to the nearest boolean expression ('%s')", (fold) => {
                    const originalNode = {
                        type: "Expression",
                        operator: "<",
                        args: [
                            {
                                type: "Expression",
                                operator: "*",
                                args: [
                                    {
                                        type: "Subscript",
                                        base: { type: "Identifier", value: "ResourceQuantity" },
                                        key: {
                                            type: "List",
                                            values: [
                                                { type: "Identifier", value: "Iridium" },
                                                { type: "Identifier", value: "Alloy" },
                                                { type: "Identifier", value: "Aluminium" },
                                            ],
                                            fold
                                        }
                                    },
                                    { type: "Number", value: 2 }
                                ]
                            },
                            { type: "Number", value: 10 }
                        ]
                    };

                    const { node, from } = processExpression(originalNode as Parser.Expression);

                    const subtree = (i: number) => from(originalNode, {
                        args: [
                            from(originalNode.args[0], {
                                args: [
                                    from(originalNode.args[0].args![0], {
                                        key: originalNode.args[0].args![0].key!.values[i]
                                    }),
                                    originalNode.args[0].args![1]
                                ]
                            }),
                            originalNode.args[1]
                        ]
                    });

                    const expectedNode = from(originalNode, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode, {
                                type: "Expression",
                                operator: fold,
                                args: [
                                    subtree(0),
                                    subtree(1)
                                ]
                            }),
                            subtree(2)
                        ]
                    });

                    expect(valuesOf(node)).toEqual(valuesOf(expectedNode));
                    expect(originsOf(node)).toStrictEqual(originsOf(expectedNode));
                });

                it("should throw on multiple folds", () => {
                    const originalNode = {
                        type: "Expression",
                        operator: "or",
                        args: [
                            {
                                type: "List",
                                fold: "or",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" }
                                ]
                            },
                            {
                                type: "List",
                                fold: "or",
                                values: [
                                    { type: "Identifier", value: "Iridium" },
                                    { type: "Identifier", value: "Alloy" },
                                    { type: "Identifier", value: "Aluminium" }
                                ]
                            }
                        ]
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(CompileError);
                    if (error instanceof CompileError) {
                        expect(error.message).toEqual("Only one fold subexpression is allowed");
                        expect(error.offendingEntity).toBe(originalNode);
                    }
                });
            });
        });

        describe("Setting target", () => {
            it("should resolve folds inside setting targets", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoBuild" },
                        key: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "city-farm" },
                                { type: "Identifier", value: "city-mill" },
                            ]
                        }
                    },
                    value: { type: "Number", value: 123 }
                };

                const { nodes, from } = resolveFolds(originalNode as Parser.SettingAssignment);
                expect(nodes.length).toEqual(2);

                {
                    const expectedNode = from(originalNode, {
                        setting: from(originalNode.setting, {
                            key: originalNode.setting.key.values[0],
                        })
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
                }
                {
                    const expectedNode = from(originalNode, {
                        setting: from(originalNode.setting, {
                            key: originalNode.setting.key.values[1],
                        })
                    });

                    expect(valuesOf(nodes[1])).toEqual(valuesOf(expectedNode));
                    expect(originsOf(nodes[1])).toEqual(originsOf(expectedNode));
                }
            });

            it("should throw on disjunction inside setting", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "AutoBuild" },
                        key: {
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "city-farm" },
                                { type: "Identifier", value: "city-mill" },
                            ]
                        }
                    },
                    value: { type: "Number", value: 123 }
                };

                const { errors } = resolveFolds(originalNode as Parser.SettingAssignment);
                expect(errors.length).toEqual(1);

                expect(errors[0].message).toEqual("Disjunction is not allowed in setting targets");
                expect(errors[0].offendingEntity).toBe(originalNode.setting.key);
            });
        });

        describe("Setting value", () => {
            it("should resolve folds inside setting values", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const { nodes, from } = resolveFolds(originalNode as Parser.SettingAssignment);
                expect(nodes.length).toEqual(1);

                const expectedNode = from(originalNode, {
                    value: from(originalNode.value, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.value, {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    from(originalNode.value, { key: originalNode.value.key.values[0] }),
                                    from(originalNode.value, { key: originalNode.value.key.values[1] })
                                ]
                            }),
                            from(originalNode.value, { key: originalNode.value.key.values[2] })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toStrictEqual(originsOf(expectedNode));
            });

            it("should throw on unresolved folds inside settings", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceQuantity" },
                        key: {
                            type: "List",
                            fold: "and",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const { errors } = resolveFolds(originalNode as Parser.SettingAssignment);
                expect(errors.length).toEqual(1);

                expect(errors[0].message).toEqual("Fold expression detected outside of a boolean expression");
                expect(errors[0].offendingEntity.$origin).toEqual("root.value");
            });
        });

        describe("Condition", () => {
            it("should resolve folds inside conditions", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: { type: "Number", value: 123 },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const { nodes, from } = resolveFolds(originalNode as Parser.SettingAssignment);
                expect(nodes.length).toEqual(1);

                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.condition, {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    from(originalNode.condition, { key: originalNode.condition.key.values[0] }),
                                    from(originalNode.condition, { key: originalNode.condition.key.values[1] })
                                ]
                            }),
                            from(originalNode.condition, { key: originalNode.condition.key.values[2] })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toStrictEqual(originsOf(expectedNode));
            });

            it("should resolve folds inside setting shift conditions", () => {
                const originalNode = {
                    type: "SettingShift",
                    setting: { type: "Identifier", value: "hello" },
                    values: [
                        { type: "String", value: "bye" }
                    ],
                    operator: "<<",
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const { nodes, from } = resolveFolds(originalNode as Parser.SettingShift);
                expect(nodes.length).toEqual(1);

                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.condition, {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    from(originalNode.condition, { key: originalNode.condition.key.values[0] }),
                                    from(originalNode.condition, { key: originalNode.condition.key.values[1] })
                                ]
                            }),
                            from(originalNode.condition, { key: originalNode.condition.key.values[2] })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toStrictEqual(originsOf(expectedNode));
            });

            it("should resolve folds inside condition blocks", () => {
                const originalNode = {
                    type: "ConditionBlock",
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            fold: "or",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    },
                    body: []
                };

                const { nodes, from } = resolveFolds(originalNode as Parser.ConditionBlock);
                expect(nodes.length).toEqual(1);

                const expectedNode = from(originalNode, {
                    condition: from(originalNode.condition, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.condition, {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    from(originalNode.condition, { key: originalNode.condition.key.values[0] }),
                                    from(originalNode.condition, { key: originalNode.condition.key.values[1] })
                                ]
                            }),
                            from(originalNode.condition, { key: originalNode.condition.key.values[2] })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(originsOf(nodes[0])).toStrictEqual(originsOf(expectedNode));
            });

            it("should throw on unresolved folds inside conditions", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: { type: "Number", value: 123 },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceQuantity" },
                        key: {
                            type: "List",
                            fold: "and",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const { errors } = resolveFolds(originalNode as Parser.SettingAssignment);
                expect(errors.length).toEqual(1);

                expect(errors[0].message).toEqual("Fold expression detected outside of a boolean expression");
                expect(errors[0].offendingEntity.$origin).toEqual("root.condition");
            });
        });
    });
});
