import { describe, it, expect } from "vitest";
import { processExpression as processExpressionImpl, processStatement, valuesOf, originsOf, getExcepion } from "./fixture";
import { resolveFolds as resolveFoldsImpl, FoldResolver } from "$lib/core/dsl2/compiler/fold";
import { ParseError } from "$lib/core/dsl2/model";

import type * as Parser from "$lib/core/dsl2/model/2";

const processExpression = (node: Parser.Expression) => {
    return processExpressionImpl(node, (sourceMap) => new FoldResolver(sourceMap));
}

const resolveFolds = (node: Parser.Statement) => {
    return processStatement(node, resolveFoldsImpl);
}

describe("Compiler", () => {
    describe("Folds", () => {
        describe("Common expression rules", () => {
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

                    const expectedNode = from(originalNode.key, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode.key, {
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

                    const expectedNode = from(originalNode.key, {
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

                    const expectedNode = from(originalNode.key, {
                        type: "Expression",
                        operator: "and",
                        args: [
                            from(originalNode.key, {
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

                    const expectedNode = from(originalNode.key, {
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
                    expect(error).toBeInstanceOf(ParseError);
                    if (error instanceof ParseError) {
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
                    expect(error).toBeInstanceOf(ParseError);
                    if (error instanceof ParseError) {
                        expect(error.message).toEqual("Only settings of the same type are allowed to be in the same list");
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

                    const expectedNode = from(originalNode.key.key, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode.key.key, {
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

                    const expectedNode = from(originalNode.key.key, {
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
                    expect(error).toBeInstanceOf(ParseError);
                    if (error instanceof ParseError) {
                        expect(error.message).toEqual("Invalid setting");
                        expect(error.offendingEntity).toBe(originalNode.key.base);
                    }
                });

                it("should throw on multiple folds", () => {
                    const originalNode = {
                        type: "Subscript",
                        base: { type: "Identifier", value: "SettingCurrent" },
                        key: {
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
                        }
                    };

                    const error = getExcepion(() => processExpression(originalNode as Parser.Expression));
                    expect(error).toBeInstanceOf(ParseError);
                    if (error instanceof ParseError) {
                        expect(error.message).toEqual("Only one fold subexpression is allowed");
                        expect(error.offendingEntity).toBe(originalNode.key);
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
                            from(originalNode.args[0], {
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

                    const expectedNode = from(originalNode.args[0], {
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

                    const expectedNode = from(originalNode.args[1], {
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

                    const expectedNode = from(originalNode.args[0], {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.args[0], {
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

                    const expectedNode = from(originalNode.args[1], {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.args[1], {
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

                    const expectedNode = from(originalNode.args[0].args![0].key!, {
                        type: "Expression",
                        operator: fold,
                        args: [
                            from(originalNode.args[0].args![0].key!, {
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
                    expect(error).toBeInstanceOf(ParseError);
                    if (error instanceof ParseError) {
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

                const error = getExcepion(() => resolveFolds(originalNode as Parser.SettingAssignment));
                expect(error).toBeInstanceOf(ParseError);
                if (error instanceof ParseError) {
                    expect(error.message).toEqual("Disjunction is not allowed in setting targets");
                    expect(error.offendingEntity.$origin).toEqual("root.setting.key");
                }
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
                    value: from(originalNode.value.key, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.value.key, {
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

            it("should throw on ambiguous folds inside settings", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const error = getExcepion(() => resolveFolds(originalNode as Parser.SettingAssignment));
                expect(error).toBeInstanceOf(ParseError);
                if (error instanceof ParseError) {
                    expect(error.message).toEqual("Ambiguous fold expression: use 'and' or 'or' instead of the last comma");
                    expect(error.offendingEntity.$origin).toEqual("root.value.key");
                }
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

                const error = getExcepion(() => resolveFolds(originalNode as Parser.SettingAssignment));
                expect(error).toBeInstanceOf(ParseError);
                if (error instanceof ParseError) {
                    expect(error.message).toEqual("Fold expression detected outside of a boolean expression");
                    expect(error.offendingEntity.$origin).toEqual("root.value.key");
                }
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
                    condition: from(originalNode.condition.key, {
                        type: "Expression",
                        operator: "or",
                        args: [
                            from(originalNode.condition.key, {
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

            it("should throw on ambiguous folds inside conditions", () => {
                const originalNode = {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "hello" },
                    value: { type: "Number", value: 123 },
                    condition: {
                        type: "Subscript",
                        base: { type: "Identifier", value: "ResourceDemanded" },
                        key: {
                            type: "List",
                            values: [
                                { type: "Identifier", value: "Iridium" },
                                { type: "Identifier", value: "Alloy" },
                                { type: "Identifier", value: "Aluminium" },
                            ]
                        }
                    }
                };

                const error = getExcepion(() => resolveFolds(originalNode as Parser.SettingAssignment));
                expect(error).toBeInstanceOf(ParseError);
                if (error instanceof ParseError) {
                    expect(error.message).toEqual("Ambiguous fold expression: use 'and' or 'or' instead of the last comma");
                    expect(error.offendingEntity.$origin).toEqual("root.condition.key");
                }
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

                const error = getExcepion(() => resolveFolds(originalNode as Parser.SettingAssignment));
                expect(error).toBeInstanceOf(ParseError);
                if (error instanceof ParseError) {
                    expect(error.message).toEqual("Fold expression detected outside of a boolean expression");
                    expect(error.offendingEntity.$origin).toEqual("root.condition.key");
                }
            });
        });
    });
});
