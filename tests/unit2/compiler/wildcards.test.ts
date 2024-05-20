import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf, getExcepion } from "./fixture";
import { resolveWildcards as resolveWildcardsImpl } from "$lib/core/dsl2/compiler/wildcards";
import { ParseError } from "$lib/core/dsl2/model";

import type * as Parser from "$lib/core/dsl2/model/1";

const resolveWildcards = (node: Parser.Statement) => processStatement(node, resolveWildcardsImpl);

describe("Compiler", () => {
    describe("Wildcards", () => {
        it("should resolve wildcards in setting prefixes inside targets", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SmelterFuelPriority" },
                    key: { type: "Wildcard" }
                },
                value: { type: "Number", value: 123 }
            };

            const { nodes, from } = resolveWildcards(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                setting: from(originalNode.setting, {
                    key: from(originalNode.setting.key, {
                        type: "List",
                        values: [
                            from(originalNode.setting.key, { type: "Identifier", value: "Oil" }),
                            from(originalNode.setting.key, { type: "Identifier", value: "Coal" }),
                            from(originalNode.setting.key, { type: "Identifier", value: "Wood" }),
                            from(originalNode.setting.key, { type: "Identifier", value: "Inferno" }),
                        ]
                    })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve wildcards in setting prefixes inside values", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "foo" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SmelterFuelPriority" },
                    key: { type: "Wildcard" }
                }
            };

            const { nodes, from } = resolveWildcards(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    key: from(originalNode.value.key, {
                        type: "List",
                        values: [
                            from(originalNode.value.key, { type: "Identifier", value: "Oil" }),
                            from(originalNode.value.key, { type: "Identifier", value: "Coal" }),
                            from(originalNode.value.key, { type: "Identifier", value: "Wood" }),
                            from(originalNode.value.key, { type: "Identifier", value: "Inferno" }),
                        ]
                    })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it.each([
            { type: "SettingAssignment", setting: { type: "Identifier", value: "foo" }, value: { type: "Number", value: 123 }, },
            { type: "ConditionPush" }
        ])("should resolve wildcards in setting prefixes inside conditions ($type)", (base) => {
            const originalNode = {
                ...base,
                condition: {
                    type: "Expression",
                    operator: "and",
                    args: [
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "SmelterFuelPriority" },
                            key: { type: "Wildcard" }
                        },
                        {
                            type: "Subscript",
                            base: { type: "Identifier", value: "AutoDroidWeight" },
                            key: { type: "Wildcard" }
                        }
                    ]
                }
            };

            const { nodes, from } = resolveWildcards(originalNode as Parser.Statement);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    args: [
                        from(originalNode.condition.args[0], {
                            key: from(originalNode.condition.args[0].key, {
                                type: "List",
                                values: [
                                    from(originalNode.condition.args[0].key, { type: "Identifier", value: "Oil" }),
                                    from(originalNode.condition.args[0].key, { type: "Identifier", value: "Coal" }),
                                    from(originalNode.condition.args[0].key, { type: "Identifier", value: "Wood" }),
                                    from(originalNode.condition.args[0].key, { type: "Identifier", value: "Inferno" }),
                                ]
                            })
                        }),
                        from(originalNode.condition.args[1], {
                            key: from(originalNode.condition.args[1].key, {
                                type: "List",
                                values: [
                                    from(originalNode.condition.args[1].key, { type: "Identifier", value: "Adamantite" }),
                                    from(originalNode.condition.args[1].key, { type: "Identifier", value: "Aluminium" }),
                                    from(originalNode.condition.args[1].key, { type: "Identifier", value: "Uranium" }),
                                    from(originalNode.condition.args[1].key, { type: "Identifier", value: "Coal" }),
                                ]
                            })
                        })
                    ]
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve wildcards in nested setting prefixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "foo" },
                value: { type: "Number", value: 123 },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "SettingCurrent" },
                    key: {
                        type: "List",
                        values: [
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "SmelterFuelPriority" },
                                key: { type: "Wildcard" }
                            },
                            {
                                type: "Subscript",
                                base: { type: "Identifier", value: "AutoDroidWeight" },
                                key: { type: "Wildcard" }
                            }
                        ]
                    }
                }
            };

            const { nodes, from } = resolveWildcards(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                condition: from(originalNode.condition, {
                    key: from(originalNode.condition.key, {
                        values: [
                            from(originalNode.condition.key.values[0], {
                                key: from(originalNode.condition.key.values[0].key, {
                                    type: "List",
                                    values: [
                                        from(originalNode.condition.key.values[0].key, { type: "Identifier", value: "Oil" }),
                                        from(originalNode.condition.key.values[0].key, { type: "Identifier", value: "Coal" }),
                                        from(originalNode.condition.key.values[0].key, { type: "Identifier", value: "Wood" }),
                                        from(originalNode.condition.key.values[0].key, { type: "Identifier", value: "Inferno" }),
                                    ]
                                })
                            }),
                            from(originalNode.condition.key.values[1], {
                                key: from(originalNode.condition.key.values[1].key, {
                                    type: "List",
                                    values: [
                                        from(originalNode.condition.key.values[1].key, { type: "Identifier", value: "Adamantite" }),
                                        from(originalNode.condition.key.values[1].key, { type: "Identifier", value: "Aluminium" }),
                                        from(originalNode.condition.key.values[1].key, { type: "Identifier", value: "Uranium" }),
                                        from(originalNode.condition.key.values[1].key, { type: "Identifier", value: "Coal" }),
                                    ]
                                })
                            })
                        ]
                    })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on wildcards in override expressions", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "foo" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "JobUnlocked" },
                    key: { type: "Wildcard" }
                }
            };

            const error = getExcepion(() => resolveWildcards(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(ParseError);
            if (error instanceof ParseError) {
                expect(error.message).toEqual("Wildcards are only supported for setting prefixes");
                expect(error.offendingEntity).toBe(originalNode.value.key);
            }
        });
    });
});
