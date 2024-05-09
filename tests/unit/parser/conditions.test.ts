import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

import type { ConditionPush, ConditionPop, SettingAssignment } from "$lib/core/dsl/parser/model";

describe("Parser", () => {
    describe("Conditions", () => {
        describe("Inline", () => {
            it("should parse unary conditions", () => {
                const { nodes, errors, maps } = parse("foo = 123 if aaa.bbb");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = 123 if aaa.bbb", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("123", 123),
                    condition: maps("aaa.bbb", { name: maps("aaa"), targets: [maps("bbb")] })
                }));
            });

            it("should parse negated unary conditions", () => {
                const { nodes, errors, maps } = parse("foo = 123 if not aaa.bbb");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = 123 if not aaa.bbb", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("123", 123),
                    condition: maps("not aaa.bbb", {
                        operator: maps("not"),
                        args: [
                            maps("aaa.bbb", { name: maps("aaa"), targets: [maps("bbb")] })
                        ]
                    })
                }));
            });

            it("should parse binary conditions", () => {
                const { nodes, errors, maps } = parse("foo = 123 if aaa.bbb < 123");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = 123 if aaa.bbb < 123", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("123", 123),
                    condition: maps("aaa.bbb < 123", {
                        operator: maps("<"),
                        args: [
                            maps("aaa.bbb", { name: maps("aaa"), targets: [maps("bbb")] }),
                            maps("123", 123)
                        ]
                    })
                }));
            });

            describe("Operator precedence", () => {
                it("should put quotes before anything else", () => {
                    const { nodes, errors, maps } = parse("foo = 123 if not (aaa or bbb)");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps("foo = 123 if not (aaa or bbb)", <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), targets: [] }),
                        value: maps("123", 123),
                        condition: maps("not (aaa or bbb)", {
                            operator: maps("not"),
                            args: [
                                maps("aaa or bbb", {
                                    operator: maps("or"),
                                    args: [
                                        maps("aaa", { name: maps("aaa"), targets: [] }),
                                        maps("bbb", { name: maps("bbb"), targets: [] })
                                    ]
                                })
                            ]
                        })
                    }));
                });

                it("should put 'not' before '*'", () => {
                    const { nodes, errors, maps } = parse("foo = 123 if not aaa * bbb");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps("foo = 123 if not aaa * bbb", <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), targets: [] }),
                        value: maps("123", 123),
                        condition: maps("not aaa * bbb", {
                            operator: maps("*"),
                            args: [
                                maps("not aaa", {
                                    operator: maps("not"),
                                    args: [maps("aaa", { name: maps("aaa"), targets: [] })]
                                }),
                                maps("bbb", { name: maps("bbb"), targets: [] })
                            ]
                        })
                    }));
                });

                describe.each([
                    { first: "*", second: "+" },
                    // { first: "*", second: "-" },

                    { first: "/", second: "+" },
                    // { first: "/", second: "-" },

                    { first: "+", second: ">" },
                    // { first: "+", second: ">=" },
                    // { first: "+", second: "<" },
                    // { first: "+", second: "<=" },
                    // { first: "-", second: ">" },
                    // { first: "-", second: ">=" },
                    // { first: "-", second: "<" },
                    // { first: "-", second: "<=" },

                    { first: ">=", second: "==" },
                    // { first: "<", second: "==" },
                    // { first: "<=", second: "==" },
                    // { first: ">", second: "==" },
                    // { first: ">=", second: "==" },
                    // { first: "<", second: "==" },
                    // { first: "<=", second: "==" },
                    // { first: ">=", second: "==" },

                    { first: ">=", second: "!=" },
                    // { first: "<", second: "!=" },
                    // { first: "<=", second: "!=" },
                    // { first: ">", second: "!=" },
                    // { first: ">=", second: "!=" },
                    // { first: "<", second: "!=" },
                    // { first: "<=", second: "!=" },
                    // { first: ">=", second: "!=" },

                    { first: "==", second: "and" },
                    // { first: "!=", second: "and" },

                    { first: "and", second: "or" },
                ])("should put $first before $second", ({first, second}) => {
                    it(`a ${second} b ${first} c ${second} d`, () => {
                        const { nodes, errors, maps } = parse(`foo = 123 if aaa ${second} bbb ${first} ccc ${second} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        expect(nodes[0]).toStrictEqual(maps(`foo = 123 if aaa ${second} bbb ${first} ccc ${second} ddd`, <SettingAssignment> {
                            type: "SettingAssignment",
                            setting: maps("foo", { name: maps("foo"), targets: [] }),
                            value: maps("123", 123),
                            condition: maps(`aaa ${second} bbb ${first} ccc ${second} ddd`, {
                                operator: maps(second),
                                args: [
                                    maps(`aaa ${second} bbb ${first} ccc`, {
                                        operator: maps(second),
                                        args: [
                                            maps("aaa", { name: maps("aaa"), targets: [] }),
                                            maps(`bbb ${first} ccc`, {
                                                operator: maps(first),
                                                args: [
                                                    maps("bbb", { name: maps("bbb"), targets: [] }),
                                                    maps("ccc", { name: maps("ccc"), targets: [] })
                                                ]
                                            })
                                        ]
                                    }),
                                    maps("ddd", { name: maps("ddd"), targets: [] })
                                ]
                            })
                        }));
                    });

                    it(`a ${first} b ${second} c ${first} d`, () => {
                        const { nodes, errors, maps } = parse(`foo = 123 if aaa ${first} bbb ${second} ccc ${first} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        expect(nodes[0]).toStrictEqual(maps(`foo = 123 if aaa ${first} bbb ${second} ccc ${first} ddd`, <SettingAssignment> {
                            type: "SettingAssignment",
                            setting: maps("foo", { name: maps("foo"), targets: [] }),
                            value: maps("123", 123),
                            condition: maps(`aaa ${first} bbb ${second} ccc ${first} ddd`, {
                                operator: maps(second),
                                args: [
                                    maps(`aaa ${first} bbb`, {
                                        operator: maps(first),
                                        args: [
                                            maps("aaa", { name: maps("aaa"), targets: [] }),
                                            maps("bbb", { name: maps("bbb"), targets: [] })
                                        ]
                                    }),
                                    maps(`ccc ${first} ddd`, {
                                        operator: maps(first),
                                        args: [
                                            maps("ccc", { name: maps("ccc"), targets: [] }),
                                            maps("ddd", { name: maps("ddd"), targets: [] })
                                        ]
                                    })
                                ]
                            })
                        }));
                    });
                });

                it.each([
                    { first: "+", second: "-" },

                    { first: "*", second: "/" },

                    { first: "<", second: "<=" },
                    { first: "<=", second: ">" },
                    { first: ">", second: ">=" },
                    { first: ">=", second: "<" },

                    { first: "==", second: "!=" },
                ])("should treat $first and $second equally", ({ first, second }) => {
                    const { nodes, errors, maps } = parse(`foo = 123 if aaa ${first} bbb ${second} ccc ${first} ddd`);

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps(`foo = 123 if aaa ${first} bbb ${second} ccc ${first} ddd`, <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), targets: [] }),
                        value: maps("123", 123),
                        condition: maps(`aaa ${first} bbb ${second} ccc ${first} ddd`, {
                            operator: maps(first),
                            args: [
                                maps(`aaa ${first} bbb ${second} ccc`, {
                                    operator: maps(second),
                                    args: [
                                        maps(`aaa ${first} bbb`, {
                                            operator: maps(first),
                                            args: [
                                                maps("aaa", { name: maps("aaa"), targets: [] }),
                                                maps("bbb", { name: maps("bbb"), targets: [] })
                                            ]
                                        }),
                                        maps("ccc", { name: maps("ccc"), targets: [] })
                                    ]
                                }),
                                maps("ddd", { name: maps("ddd"), targets: [] })
                            ]
                        })
                    }));
               });
            });
        });

        describe("Blocks", () => {
            it("should push and pop condition", () => {
                const { nodes, errors, maps } = parse(`
                    \x01if aaa.bbb then
                        \x03if ccc then
                            foo = 123
                        end\x04

                        bar = 456

                        \x05if ddd then
                        end\x06
                    end\x02
                `);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(8);

                expect(nodes[0]).toStrictEqual(maps([1, 2], <ConditionPush> {
                    type: "ConditionPush",
                    condition: maps("aaa.bbb", { name: maps("aaa"), targets: [maps("bbb")] })
                }));

                expect(nodes[1]).toStrictEqual(maps([3, 4], <ConditionPush> {
                    type: "ConditionPush",
                    condition: maps("ccc", { name: maps("ccc"), targets: [] })
                }));

                expect(nodes[2]).toStrictEqual(maps("foo = 123", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("123", 123)
                }));

                expect(nodes[3]).toStrictEqual(maps([3, 4], <ConditionPop> {
                    type: "ConditionPop",
                }));

                expect(nodes[4]).toStrictEqual(maps("bar = 456", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("bar", { name: maps("bar"), targets: [] }),
                    value: maps("456", 456)
                }));

                expect(nodes[5]).toStrictEqual(maps([5, 6], <ConditionPush> {
                    type: "ConditionPush",
                    condition: maps("ddd", { name: maps("ddd"), targets: [] })
                }));

                expect(nodes[6]).toStrictEqual(maps([5, 6], <ConditionPop> {
                    type: "ConditionPop"
                }));

                expect(nodes[7]).toStrictEqual(maps([1, 2], <ConditionPop> {
                    type: "ConditionPop"
                }));
            });
        });
    });
});
