import { describe, it, expect } from "vitest";
import { unwrapExpression, normalizeExpression } from "$lib/core/dsl/compiler/normalize";
import { makeDummyLocation, withDummyLocation } from "./fixture";
import { withLocation } from "$lib/core/dsl/parser/utils";
import { ParseError } from "$lib/core/dsl/parser/model";

import type * as Parser from "$lib/core/dsl/parser/model";
import type { SourceTrackedType } from "$lib/core/dsl/parser/utils";

function isExpression(expression: any): expression is Parser.Expression {
    return expression.expressions === undefined;
}

function at<T>(id: number, value: T): SourceTrackedType<T> {
    return withLocation(makeDummyLocation(id), value);
}

function getExcepion(fn: () => any): Error | undefined {
    try {
        fn();
    }
    catch (e) {
        return e as Error;
    }
}

describe("Compiler", () => {
    describe("Expression normalization", () => {
        describe("Fold unwrapping", () => {
            it.each(["and", "or"])("should immediately unwrap boolean prefixes", (op) => {
                const node = at(1, <Parser.Identifier> {
                    name: at(2, "ResourceDemanded"),
                    targets: [
                        at(3, "Food"),
                        at(4, "Lumber"),
                        at(5, "Stone"),
                    ],
                    disjunction: withDummyLocation(op === "or")
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(true);
                expect(expression).toStrictEqual(at(1, {
                    operator: at(1, op),
                    args: [
                        at(1, {
                            operator: at(1, op),
                            args: [
                                at(1, { name: at(2, "ResourceDemanded"), targets: [at(3, "Food")] }),
                                at(1, { name: at(2, "ResourceDemanded"), targets: [at(4, "Lumber")] })
                            ]
                        }),
                        at(1, { name: at(2, "ResourceDemanded"), targets: [at(5, "Stone")] })
                    ]
                }));
            });

            it.each(["and", "or"])("should immediately unwrap boolean setting arguments", (op) => {
                const node = at(1, <Parser.Identifier> {
                    name: at(2, "SettingCurrent"),
                    targets: [
                        at(3, "challenge_plasmid"),
                        at(4, "challenge_crispr")
                    ],
                    disjunction: withDummyLocation(op === "or")
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(true);
                expect(expression).toStrictEqual(at(1, {
                    operator: at(1, op),
                    args: [
                        at(1, { name: at(2, "SettingCurrent"), targets: [at(5, "challenge_plasmid")] }),
                        at(1, { name: at(2, "SettingCurrent"), targets: [at(5, "challenge_crispr")] })
                    ]
                }));
            });

            it.each(["and", "or"])("should not immediately unwrap non-boolean prefixes", (op) => {
                const node = at(1, <Parser.Identifier> {
                    name: at(2, "ResourceQuantity"),
                    targets: [
                        at(3, "Food"),
                        at(4, "Lumber"),
                        at(5, "Stone"),
                    ],
                    disjunction: withDummyLocation(op === "or")
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(false);
                expect(expression).toStrictEqual(at(1, {
                    operator: op,
                    expressions: [
                        at(1, { name: at(2, "ResourceQuantity"), targets: [at(3, "Food")] }),
                        at(1, { name: at(2, "ResourceQuantity"), targets: [at(4, "Lumber")] }),
                        at(1, { name: at(2, "ResourceQuantity"), targets: [at(5, "Stone")] })
                    ]
                }));
            });

            it.each(["and", "or"])("should not immediately unwrap non-boolean setting arguments", (op) => {
                const node = at(1, <Parser.Identifier> {
                    name: at(2, "SettingCurrent"),
                    targets: [
                        at(3, "foreignMinAdvantage"),
                        at(4, "foreignMaxAdvantage")
                    ],
                    disjunction: withDummyLocation(op === "or")
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(false);
                expect(expression).toStrictEqual(at(1, {
                    operator: op,
                    expressions: [
                        at(1, { name: at(2, "SettingCurrent"), targets: [at(3, "foreignMinAdvantage")] }),
                        at(1, { name: at(2, "SettingCurrent"), targets: [at(4, "foreignMaxAdvantage")] })
                    ]
                }));
            });

            it.each(["and", "or"])("should apply arithmetic operators while unwrapping", (op) => {
                const node = at(1, <Parser.EvaluatedExpression> {
                    operator: at(2, "+"),
                    args: [
                        at(3, <Parser.Identifier> {
                            name: at(5, "ResourceQuantity"),
                            targets: [
                                at(6, "Food"),
                                at(7, "Lumber"),
                                at(8, "Stone"),
                            ],
                            disjunction: withDummyLocation(op === "or")
                        }),
                        at(4, 10)
                    ]
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(false);
                expect(expression).toStrictEqual(at(3, {
                    operator: op,
                    expressions: [
                        at(1, <Parser.EvaluatedExpression> {
                            operator: at(2, "+"),
                            args: [
                                at(3, { name: at(5, "ResourceQuantity"), targets: [at(6, "Food")] }),
                                at(4, 10)
                            ]
                        }),
                        at(1, <Parser.EvaluatedExpression> {
                            operator: at(2, "+"),
                            args: [
                                at(3, { name: at(5, "ResourceQuantity"), targets: [at(7, "Lumber")] }),
                                at(4, 10)
                            ]
                        }),
                        at(1, <Parser.EvaluatedExpression> {
                            operator: at(2, "+"),
                            args: [
                                at(3, { name: at(5, "ResourceQuantity"), targets: [at(8, "Stone")] }),
                                at(4, 10)
                            ]
                        })
                    ]
                }));
            });

            it.each(["and", "or"])("should preserve order of operands in arithmeric expressions", (op) => {
                const node = at(1, <Parser.EvaluatedExpression> {
                    operator: at(2, "+"),
                    args: [
                        at(4, 10),
                        at(3, <Parser.Identifier> {
                            name: at(5, "ResourceQuantity"),
                            targets: [
                                at(6, "Food"),
                                at(7, "Lumber"),
                                at(8, "Stone"),
                            ],
                            disjunction: withDummyLocation(op === "or")
                        })
                    ]
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(false);
                expect(expression).toStrictEqual(at(3, {
                    operator: op,
                    expressions: [
                        at(1, <Parser.EvaluatedExpression> {
                            operator: at(2, "+"),
                            args: [
                                at(4, 10),
                                at(3, { name: at(5, "ResourceQuantity"), targets: [at(6, "Food")] })
                            ]
                        }),
                        at(1, <Parser.EvaluatedExpression> {
                            operator: at(2, "+"),
                            args: [
                                at(4, 10),
                                at(3, { name: at(5, "ResourceQuantity"), targets: [at(7, "Lumber")] })
                            ]
                        }),
                        at(1, <Parser.EvaluatedExpression> {
                            operator: at(2, "+"),
                            args: [
                                at(4, 10),
                                at(3, { name: at(5, "ResourceQuantity"), targets: [at(8, "Stone")] })
                            ]
                        })
                    ]
                }));
            });

            it.each(["and", "or"])("should unwrap until the nearest boolean expression", (op) => {
                const node = at(1, <Parser.EvaluatedExpression> {
                    operator: at(2, "<"),
                    args: [
                        at(3, {
                            operator: at(5, "*"),
                            args: [
                                at(6, <Parser.Identifier> {
                                    name: at(8, "ResourceQuantity"),
                                    targets: [
                                        at(9, "Food"),
                                        at(10, "Lumber"),
                                        at(11, "Stone"),
                                    ],
                                    disjunction: withDummyLocation(op === "or")
                                }),
                                at(7, 2)
                            ]
                        }),
                        at(4, 10)
                    ]
                });

                const expression = unwrapExpression(node);

                expect(isExpression(expression)).toBe(true);
                expect(expression).toStrictEqual(at(1, {
                    operator: at(1, op),
                    args: [
                        at(1, {
                            operator: at(1, op),
                            args: [
                                at(1, {
                                    operator: at(2, "<"),
                                    args: [
                                        at(3, {
                                            operator: at(5, "*"),
                                            args: [
                                                at(6, { name: at(8, "ResourceQuantity"), targets: [at(9, "Food")] }),
                                                at(7, 2)
                                            ]
                                        }),
                                        at(4, 10)
                                    ]
                                }),
                                at(1, {
                                    operator: at(2, "<"),
                                    args: [
                                        at(3, {
                                            operator: at(5, "*"),
                                            args: [
                                                at(6, { name: at(8, "ResourceQuantity"), targets: [at(10, "Lumber")] }),
                                                at(7, 2)
                                            ]
                                        }),
                                        at(4, 10)
                                    ]
                                })
                            ]
                        }),
                        at(1, {
                            operator: at(2, "<"),
                            args: [
                                at(3, {
                                    operator: at(5, "*"),
                                    args: [
                                        at(6, { name: at(8, "ResourceQuantity"), targets: [at(11, "Stone")] }),
                                        at(7, 2)
                                    ]
                                }),
                                at(4, 10)
                            ]
                        })
                    ]
                }));
            });

            it("should reject multiple folds in a single expression", () => {
                const node = at(1, <Parser.EvaluatedExpression> {
                    operator: withDummyLocation("+"),
                    args: [
                        at(2, <Parser.Identifier> {
                            name: withDummyLocation("ResourceQuantity"),
                            targets: [
                                withDummyLocation("Food"),
                                withDummyLocation("Lumber"),
                                withDummyLocation("Stone"),
                            ]
                        }),
                        at(3, <Parser.Identifier> {
                            name: withDummyLocation("ResourceQuantity"),
                            targets: [
                                withDummyLocation("Food"),
                                withDummyLocation("Lumber"),
                                withDummyLocation("Stone"),
                            ]
                        })
                    ]
                });

                const exception = getExcepion(() => unwrapExpression(node));
                expect(exception).toBeDefined();
                expect(exception).toBeInstanceOf(ParseError);
                if (exception instanceof ParseError) {
                    expect(exception.message).toBe("Only one fold subexpression is allowed");
                    expect(exception.location).toStrictEqual(makeDummyLocation(3));
                }
            });

            it("should reject heterogeneous fold expressions", () => {
                const node = at(1, <Parser.EvaluatedExpression> {
                    operator: at(2, "*"),
                    args: [
                        at(3, <Parser.Identifier> {
                            name: withDummyLocation("SettingCurrent"),
                            targets: [
                                withDummyLocation("challenge_plasmid"),
                                withDummyLocation("foreignMaxAdvantage")
                            ]
                        }),
                        withDummyLocation(2)
                    ]
                });

                const exception = getExcepion(() => normalizeExpression(node));
                expect(exception).toBeDefined();
                expect(exception).toBeInstanceOf(ParseError);
                if (exception instanceof ParseError) {
                    expect(exception.message).toBe("All values of a fold expression must have the same type");
                    expect(exception.location).toStrictEqual(makeDummyLocation(3));
                }
            });

            it("should reject folds that are not a part of a boolean expression", () => {
                const node = at(1, <Parser.EvaluatedExpression> {
                    operator: at(2, "*"),
                    args: [
                        at(3, <Parser.Identifier> {
                            name: withDummyLocation("ResourceQuantity"),
                            targets: [
                                withDummyLocation("Food"),
                                withDummyLocation("Lumber"),
                                withDummyLocation("Stone"),
                            ]
                        }),
                        withDummyLocation(2)
                    ]
                });

                const exception = getExcepion(() => normalizeExpression(node));
                expect(exception).toBeDefined();
                expect(exception).toBeInstanceOf(ParseError);
                if (exception instanceof ParseError) {
                    expect(exception.message).toBe("Fold expression detected outside of a boolean expression");
                    expect(exception.location).toStrictEqual(makeDummyLocation(3));
                }
            });
        });

        describe("Placeholder resolution", () => {
            it("should resolve placeholders from context", () => {
                const node = at(1, <Parser.Identifier> {
                    name: at(2, "ResourceDemanded"),
                    targets: [],
                    placeholder: at(3, true),
                });

                const context = at(4, "Food");

                const expression = unwrapExpression(node, context);

                expect(isExpression(expression)).toBe(true);
                expect(expression).toStrictEqual(at(1, <Parser.Identifier> {
                    name: at(2, "ResourceDemanded"),
                    targets: [at(3, "Food")]
                }));
            });

            it("should reject placeholders without context", () => {
                const node = at(1, <Parser.Identifier> {
                    name: at(2, "ResourceDemanded"),
                    targets: [],
                    placeholder: at(3, true),
                });

                const exception = getExcepion(() => normalizeExpression(node));
                expect(exception).toBeDefined();
                expect(exception).toBeInstanceOf(ParseError);
                if (exception instanceof ParseError) {
                    expect(exception.message).toBe("Placeholder used without the context to resolve it");
                    expect(exception.location).toStrictEqual(makeDummyLocation(3));
                }
            });
        });
    });
});
