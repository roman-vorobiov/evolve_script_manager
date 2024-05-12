import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withDummyLocation, makeSettingId, makeDummyLocation } from "./fixture";

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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, {
                            name: withDummyLocation("ResourceQuantity"),
                            targets: [withDummyLocation("Morale")]
                        })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, {
                            name: withDummyLocation("SettingCurrent"),
                            targets: [withDummyLocation("prestigeType")]
                        })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            name: withDummyLocation("SettingCurrent"),
                            targets: [withDummyLocation("autoPrestige")]
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
                            left: { type: "SettingCurrent", value: "autoPrestige" },
                            right: { type: "Boolean", value: true }
                        }
                    });
                });
            });

            it("should accept valid identifiers", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        name: withDummyLocation("ResourceDemanded"),
                        targets: [withDummyLocation("Lumber")]
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
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        name: withDummyLocation(prefix),
                        targets: [withLocation(location, "Morale")]
                    })
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
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        name: withLocation(location, "hello"),
                        targets: [withDummyLocation("Morale")]
                    })
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
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withLocation(location, {
                        name: withDummyLocation("hello"),
                        targets: []
                    })
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
                    setting: withDummyLocation({
                        name: withDummyLocation("AutoTradePriority"),
                        targets: [withDummyLocation("Lumber"), withDummyLocation("Stone")]
                    }),
                    value: withDummyLocation(10),
                    condition: withDummyLocation({
                        name: withDummyLocation("ResourceDemanded"),
                        targets: [],
                        placeholder: withDummyLocation(true)
                    })
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
                    setting: withDummyLocation({
                        name: withDummyLocation("AutoTrait"),
                        targets: [],
                        wildcard: withDummyLocation(true)
                    }),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        operator: withDummyLocation("<"),
                        args: [
                            withDummyLocation({
                                name: withDummyLocation("TraitLevel"),
                                targets: [],
                                placeholder: withDummyLocation(true)
                            }),
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
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withLocation(location, {
                        name: withDummyLocation("TraitLevel"),
                        targets: [],
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
                    setting: makeSettingId("bld_m_interstellar-habitat"),
                    value: withDummyLocation({
                        name: withDummyLocation("BuildingCount"),
                        targets: [withDummyLocation("interstellar-fusion")]
                    }),
                    condition: withDummyLocation({
                        name: withDummyLocation("ResourceDemanded"),
                        targets: [withDummyLocation("Lumber")]
                    })
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
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        operator: withDummyLocation("not"),
                        args: [
                            withDummyLocation({
                                name: withDummyLocation("ResourceDemanded"),
                                targets: [withDummyLocation("Lumber")]
                            })
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
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        operator: withDummyLocation("not"),
                        args: [
                            withLocation(location, {
                                name: withDummyLocation("ResourceQuantity"),
                                targets: [withDummyLocation("Lumber")]
                            })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("=="),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation(leftType),
                                    targets: [withDummyLocation(leftValue)]
                                }),
                                withDummyLocation({
                                    name: withDummyLocation(rightType),
                                    targets: [withDummyLocation(rightValue)]
                                })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("=="),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("ResourceQuantity"),
                                    targets: [withDummyLocation("Lumber")]
                                }),
                                withLocation(location, {
                                    name: withDummyLocation("ResourceDemanded"),
                                    targets: [withDummyLocation("Lumber")]
                                })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("and"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("ResourceDemanded"),
                                    targets: [withDummyLocation("Lumber")]
                                }),
                                withDummyLocation({
                                    name: withDummyLocation("ResearchUnlocked"),
                                    targets: [withDummyLocation("tech-club")]
                                }),
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("and"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("ResourceDemanded"),
                                    targets: [withDummyLocation("Lumber")]
                                }),
                                withLocation(location, {
                                    name: withDummyLocation("ResourceQuantity"),
                                    targets: [withDummyLocation("Lumber")]
                                })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("ResourceQuantity"),
                                    targets: [withDummyLocation("Lumber")]
                                }),
                                withDummyLocation({
                                    name: withDummyLocation("BuildingCount"),
                                    targets: [withDummyLocation("city-smokehouse")]
                                }),
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("ResourceQuantity"),
                                    targets: [withDummyLocation("Lumber")]
                                }),
                                withLocation(location, {
                                    name: withDummyLocation("ResourceDemanded"),
                                    targets: [withDummyLocation("Lumber")]
                                })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, {
                            operator: withDummyLocation("+"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("ResourceQuantity"),
                                    targets: [withDummyLocation("Lumber")]
                                }),
                                withDummyLocation({
                                    name: withDummyLocation("BuildingCount"),
                                    targets: [withDummyLocation("city-smokehouse")]
                                })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    operator: withDummyLocation("+"),
                                    args: [
                                        withDummyLocation({
                                            name: withDummyLocation("ResourceQuantity"),
                                            targets: [withDummyLocation("Lumber")]
                                        }),
                                        withDummyLocation({
                                            name: withDummyLocation("BuildingCount"),
                                            targets: [withDummyLocation("city-smokehouse")]
                                        })
                                    ]
                                }),
                                withDummyLocation({
                                    name: withDummyLocation("JobMax"),
                                    targets: [withDummyLocation("farmer")]
                                })
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
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    operator: withDummyLocation("+"),
                                    args: [
                                        withDummyLocation({
                                            name: withDummyLocation("ResourceQuantity"),
                                            targets: [withDummyLocation("Lumber")]
                                        }),
                                        withLocation(location, {
                                            name: withDummyLocation("ResourceSatisfied"),
                                            targets: [withDummyLocation("Lumber")]
                                        })
                                    ]
                                }),
                                withDummyLocation({
                                    name: withDummyLocation("JobMax"),
                                    targets: [withDummyLocation("farmer")]
                                })
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
