import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withDummyLocation, makeIdentifier, makeDummyLocation } from "./fixture";

import type { SettingAssignment } from "$lib/core/dsl/parser/model";
import { withLocation } from "$lib/core/dsl/parser/utils";

describe("Compiler", () => {
    describe("Conditions", () => {
        describe("Nullary", () => {
            describe("Expression type", () => {
                it("should reject non-boolean identifiers", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, makeIdentifier("ResourceQuantity", "Morale"))
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected boolean, got number");
                    expect(errors[0].location).toStrictEqual(location);
                });

                it("should reject non-boolean setting values", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, makeIdentifier("SettingCurrent", "prestigeType"))
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected boolean, got string");
                    expect(errors[0].location).toStrictEqual(location);
                });

                it("should accept boolean setting values", () => {
                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: makeIdentifier("SettingCurrent", "autoPrestige")
                    });

                    const { statements, errors } = compile([node]);

                    expect(errors).toStrictEqual([]);
                    expect(statements.length).toBe(1);

                    expect(statements[0]).toStrictEqual({
                        type: "Override",
                        target: "autoBuild",
                        value: true,
                        condition: {
                            op: "==",
                            left: { type: "SettingCurrent", value: "autoPrestige" },
                            right: { type: "Boolean", value: true }
                        }
                    });
                });
            });

            it("should accept valid identifiers", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: makeIdentifier("ResourceDemanded", "Lumber")
                });

                const { statements, errors } = compile([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(1);

                expect(statements[0]).toStrictEqual({
                    type: "Override",
                    target: "autoBuild",
                    value: true,
                    condition: {
                        op: "==",
                        left: { type: "ResourceDemanded", value: "Lumber" },
                        right: { type: "Boolean", value: true }
                    }
                });
            });

            it.each([
                { prefix: "BuildingUnlocked", type: "building" },
                { prefix: "ResearchUnlocked", type: "tech" },
            ])("should reject mismatched suffixes", ({ prefix, type }) => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: makeIdentifier(prefix, withLocation(location, "Morale"))
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe(`Unknown ${type} 'Morale'`);
                expect(errors[0].location).toStrictEqual(location);
            });

            it("should reject invalid prefixes", () => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: makeIdentifier(withLocation(location, "hello"), "Morale")
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown expression type 'hello'");
                expect(errors[0].location).toStrictEqual(location);
            });

            it("should reject invalid 'other' expressions", () => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withLocation(location, makeIdentifier("hello"))
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown expression 'hello'");
                expect(errors[0].location).toStrictEqual(location);
            });

            it("should pass arguments from setting name as context to conditions", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("AutoTradePriority", "Lumber", "Stone"),
                    value: withDummyLocation(10),
                    condition: {
                        ...makeIdentifier("ResourceDemanded"),
                        placeholder: withDummyLocation(true)
                    }
                });

                const { statements, errors } = compile([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(2);

                expect(statements[0]).toStrictEqual({
                    type: "Override",
                    target: "res_trade_p_Lumber",
                    value: 10,
                    condition: {
                        op: "==",
                        left: { type: "ResourceDemanded", value: "Lumber" },
                        right: { type: "Boolean", value: true }
                    }
                });

                expect(statements[1]).toStrictEqual({
                    type: "Override",
                    target: "res_trade_p_Stone",
                    value: 10,
                    condition: {
                        op: "==",
                        left: { type: "ResourceDemanded", value: "Stone" },
                        right: { type: "Boolean", value: true }
                    }
                });
            });

            it("should pass arguments from setting name as context to conditions when using wildcards", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: {
                        ...makeIdentifier("AutoTrait"),
                        wildcard: withDummyLocation(true)
                    },
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        operator: withDummyLocation("<"),
                        args: [
                            {
                                ...makeIdentifier("TraitLevel"),
                                placeholder: withDummyLocation(true)
                            },
                            withDummyLocation(10)
                        ]
                    })
                });

                const traits = [
                    "tactical",
                    "analytical",
                    "promiscuous",
                    "resilient",
                    "cunning",
                    "hardy",
                    "ambidextrous",
                    "industrious",
                    "content",
                    "fibroblast",
                    "metallurgist",
                    "gambler",
                    "persuasive",
                    "fortify",
                    "mastery",
                ];

                const { statements, errors } = compile([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(traits.length);

                for (const [i, trait] of traits.entries()) {
                    expect(statements[i]).toStrictEqual({
                        type: "Override",
                        target: `mTrait_${trait}`,
                        value: true,
                        condition: {
                            op: "<",
                            left: { type: "TraitLevel", value: trait },
                            right: { type: "Number", value: 10 }
                        }
                    });
                }
            });

            it("should reject wildcards in conditions", () => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withLocation(location, {
                        ...makeIdentifier("TraitLevel"),
                        wildcard: withLocation(location, true)
                    })
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Wildcards are not allowed in conditions");
                expect(errors[0].location).toStrictEqual(location);
            });

            it("should pass condition to expression assignment", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("bld_m_interstellar-habitat"),
                    value: makeIdentifier("BuildingCount", "interstellar-fusion"),
                    condition: makeIdentifier("ResourceDemanded", "Lumber")
                });

                const { statements, errors } = compile([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(1);

                expect(statements[0]).toStrictEqual({
                    type: "Override",
                    target: "bld_m_interstellar-habitat",
                    value: null,
                    condition: {
                        op: "A?B",
                        left: { type: "ResourceDemanded", value: "Lumber" },
                        right: { type: "BuildingCount", value: "interstellar-fusion" }
                    }
                });
            });
        });

        describe("Unary", () => {
            it("should accept boolean args", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        operator: withDummyLocation("not"),
                        args: [
                            makeIdentifier("ResourceDemanded", "Lumber")
                        ]
                    })
                });

                const { statements, errors } = compile([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(1);

                expect(statements[0]).toStrictEqual({
                    type: "Override",
                    target: "autoBuild",
                    value: true,
                    condition: {
                        op: "==",
                        left: { type: "ResourceDemanded", value: "Lumber" },
                        right: { type: "Boolean", value: false }
                    }
                });
            });

            it("should reject non-boolean args", () => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeIdentifier("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        operator: withDummyLocation("not"),
                        args: [
                            withLocation(location, makeIdentifier("ResourceQuantity", "Lumber"))
                        ]
                    })
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Expected boolean, got number");
                expect(errors[0].location).toStrictEqual(location);
            });
        });

        describe("Binary", () => {
            describe("==, !=", () => {
                it.each([
                    { leftType: "ResourceDemanded", leftValue: "Lumber", rightType: "ResearchUnlocked", rightValue: "tech-club" },
                    { leftType: "ResourceQuantity", leftValue: "Lumber", rightType: "BuildingCount", rightValue: "city-smokehouse" },
                ])("should accept args of the same type", ({ leftType, leftValue, rightType, rightValue }) => {
                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("=="),
                            args: [
                                makeIdentifier(leftType, leftValue),
                                makeIdentifier(rightType, rightValue)
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(errors).toStrictEqual([]);
                    expect(statements.length).toBe(1);

                    expect(statements[0]).toStrictEqual({
                        type: "Override",
                        target: "autoBuild",
                        value: true,
                        condition: {
                            op: "==",
                            left: { type: leftType, value: leftValue },
                            right: { type: rightType, value: rightValue }
                        }
                    });
                });

                it("should reject different args", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("=="),
                            args: [
                                makeIdentifier("ResourceQuantity", "Lumber"),
                                withLocation(location, makeIdentifier("ResourceDemanded", "Lumber"))
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected number, got boolean");
                    expect(errors[0].location).toStrictEqual(location);
                });
            });

            describe("and, or", () => {
                it("should accept boolean args", () => {
                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("and"),
                            args: [
                                makeIdentifier("ResourceDemanded", "Lumber"),
                                makeIdentifier("ResearchUnlocked", "tech-club"),
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(errors).toStrictEqual([]);
                    expect(statements.length).toBe(1);

                    expect(statements[0]).toStrictEqual({
                        type: "Override",
                        target: "autoBuild",
                        value: true,
                        condition: {
                            op: "AND",
                            left: { type: "ResourceDemanded", value: "Lumber" },
                            right: { type: "ResearchUnlocked", value: "tech-club" }
                        }
                    });
                });

                it("should reject non-boolean args", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("and"),
                            args: [
                                makeIdentifier("ResourceDemanded", "Lumber"),
                                withLocation(location, makeIdentifier("ResourceQuantity", "Lumber"))
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected boolean, got number");
                    expect(errors[0].location).toStrictEqual(location);
                });
            });

            describe("<, <=, >, >=", () => {
                it("should accept numeric args", () => {
                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                makeIdentifier("ResourceQuantity", "Lumber"),
                                makeIdentifier("BuildingCount", "city-smokehouse"),
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(errors).toStrictEqual([]);
                    expect(statements.length).toBe(1);

                    expect(statements[0]).toStrictEqual({
                        type: "Override",
                        target: "autoBuild",
                        value: true,
                        condition: {
                            op: "<",
                            left: { type: "ResourceQuantity", value: "Lumber" },
                            right: { type: "BuildingCount", value: "city-smokehouse" }
                        }
                    });
                });

                it("should reject non-numeric args", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                makeIdentifier("ResourceQuantity", "Lumber"),
                                withLocation(location, makeIdentifier("ResourceDemanded", "Lumber"))
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected number, got boolean");
                    expect(errors[0].location).toStrictEqual(location);
                });
            });

            describe("+, -, *, /", () => {
                it("should reject numeric values as conditions", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, {
                            operator: withDummyLocation("+"),
                            args: [
                                makeIdentifier("ResourceQuantity", "Lumber"),
                                makeIdentifier("BuildingCount", "city-smokehouse")
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected boolean, got number");
                    expect(errors[0].location).toStrictEqual(location);
                });

                it("should allow numeric values nested in a boolean condition", () => {
                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    operator: withDummyLocation("+"),
                                    args: [
                                        makeIdentifier("ResourceQuantity", "Lumber"),
                                        makeIdentifier("BuildingCount", "city-smokehouse")
                                    ]
                                }),
                                makeIdentifier("JobMax", "farmer")
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(errors).toStrictEqual([]);
                    expect(statements.length).toBe(1);

                    expect(statements[0]).toStrictEqual({
                        type: "Override",
                        target: "autoBuild",
                        value: true,
                        condition: {
                            op: "<",
                            left: { type: "Eval", value: "_('ResourceQuantity', 'Lumber') + _('BuildingCount', 'city-smokehouse')" },
                            right: { type: "JobMax", value: "farmer" }
                        }
                    });
                });

                it("should reject non-numeric args", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeIdentifier("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    operator: withDummyLocation("+"),
                                    args: [
                                        makeIdentifier("ResourceQuantity", "Lumber"),
                                        withLocation(location, makeIdentifier("ResourceSatisfied", "Lumber"))
                                    ]
                                }),
                                makeIdentifier("JobMax", "farmer")
                            ]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected number, got boolean");
                    expect(errors[0].location).toStrictEqual(location);
                });
            });
        });
    });
});
