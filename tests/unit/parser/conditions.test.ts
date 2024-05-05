import { describe, it, expect } from "vitest";
import { parse } from "./fixture";

import type { SettingAssignment } from "$lib/core/dsl/parser/model";

describe("Parser", () => {
    describe("Conditions", () => {
        describe("Inline", () => {
            it("should parse unary conditions", () => {
                const { nodes, errors, maps } = parse("foo = bar if aaa.bbb");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = bar if aaa.bbb", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), arguments: [] }),
                    value: maps("bar"),
                    condition: maps("aaa.bbb", { name: maps("aaa"), arguments: [maps("bbb")] })
                }));
            });

            it("should parse negated unary conditions", () => {
                const { nodes, errors, maps } = parse("foo = bar if not aaa.bbb");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = bar if not aaa.bbb", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), arguments: [] }),
                    value: maps("bar"),
                    condition: maps("not aaa.bbb", {
                        op: maps("not"),
                        arguments: [
                            maps("aaa.bbb", { name: maps("aaa"), arguments: [maps("bbb")] })
                        ]
                    })
                }));
            });

            it("should parse binary conditions", () => {
                const { nodes, errors, maps } = parse("foo = bar if aaa.bbb < 123");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = bar if aaa.bbb < 123", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), arguments: [] }),
                    value: maps("bar"),
                    condition: maps("aaa.bbb < 123", {
                        op: maps("<"),
                        arguments: [
                            maps("aaa.bbb", { name: maps("aaa"), arguments: [maps("bbb")] }),
                            maps("123", 123),
                        ]
                    })
                }));
            });

            describe("Operator precedence", () => {
                it("should put quotes before anything else", () => {
                    const { nodes, errors, maps } = parse("foo = bar if not (aaa or bbb)");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps("foo = bar if not (aaa or bbb)", <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), arguments: [] }),
                        value: maps("bar"),
                        condition: maps("not (aaa or bbb)", {
                            op: maps("not"),
                            arguments: [
                                maps("aaa or bbb", {
                                    op: maps("or"),
                                    arguments: [
                                        maps("aaa", { name: maps("aaa"), arguments: [] }),
                                        maps("bbb", { name: maps("bbb"), arguments: [] }),
                                    ]
                                })
                            ]
                        })
                    }));
                });

                it("should put 'not' before '*'", () => {
                    const { nodes, errors, maps } = parse("foo = bar if not aaa * bbb");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps("foo = bar if not aaa * bbb", <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), arguments: [] }),
                        value: maps("bar"),
                        condition: maps("not aaa * bbb", {
                            op: maps("*"),
                            arguments: [
                                maps("not aaa", {
                                    op: maps("not"),
                                    arguments: [
                                        maps("aaa", { name: maps("aaa"), arguments: [] })
                                    ]
                                }),
                                maps("bbb", { name: maps("bbb"), arguments: [] })
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
                        const { nodes, errors, maps } = parse(`foo = bar if aaa ${second} bbb ${first} ccc ${second} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        expect(nodes[0]).toStrictEqual(maps(`foo = bar if aaa ${second} bbb ${first} ccc ${second} ddd`, <SettingAssignment> {
                            type: "SettingAssignment",
                            setting: maps("foo", { name: maps("foo"), arguments: [] }),
                            value: maps("bar"),
                            condition: maps(`aaa ${second} bbb ${first} ccc ${second} ddd`, {
                                op: maps(second),
                                arguments: [
                                    maps(`aaa ${second} bbb ${first} ccc`, {
                                        op: maps(second),
                                        arguments: [
                                            maps("aaa", { name: maps("aaa"), arguments: [] }),
                                            maps(`bbb ${first} ccc`, {
                                                op: maps(first),
                                                arguments: [
                                                    maps("bbb", { name: maps("bbb"), arguments: [] }),
                                                    maps("ccc", { name: maps("ccc"), arguments: [] })
                                                ]
                                            })
                                        ]
                                    }),
                                    maps("ddd", { name: maps("ddd"), arguments: [] })
                                ]
                            })
                        }));
                    });

                    it(`a ${first} b ${second} c ${first} d`, () => {
                        const { nodes, errors, maps } = parse(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        expect(nodes[0]).toStrictEqual(maps(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`, <SettingAssignment> {
                            type: "SettingAssignment",
                            setting: maps("foo", { name: maps("foo"), arguments: [] }),
                            value: maps("bar"),
                            condition: maps(`aaa ${first} bbb ${second} ccc ${first} ddd`, {
                                op: maps(second),
                                arguments: [
                                    maps(`aaa ${first} bbb`, {
                                        op: maps(first),
                                        arguments: [
                                            maps("aaa", { name: maps("aaa"), arguments: [] }),
                                            maps("bbb", { name: maps("bbb"), arguments: [] })
                                        ]
                                    }),
                                    maps(`ccc ${first} ddd`, {
                                        op: maps(first),
                                        arguments: [
                                            maps("ccc", { name: maps("ccc"), arguments: [] }),
                                            maps("ddd", { name: maps("ddd"), arguments: [] })
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
                    const { nodes, errors, maps } = parse(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`);

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`, <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), arguments: [] }),
                        value: maps("bar"),
                        condition: maps(`aaa ${first} bbb ${second} ccc ${first} ddd`, {
                            op: maps(first),
                            arguments: [
                                maps(`aaa ${first} bbb ${second} ccc`, {
                                    op: maps(second),
                                    arguments: [
                                        maps(`aaa ${first} bbb`, {
                                            op: maps(first),
                                            arguments: [
                                                maps("aaa", { name: maps("aaa"), arguments: [] }),
                                                maps("bbb", { name: maps("bbb"), arguments: [] })
                                            ]
                                        }),
                                        maps("ccc", { name: maps("ccc"), arguments: [] })
                                    ]
                                }),
                                maps("ddd", { name: maps("ddd"), arguments: [] })
                            ]
                        })
                    }));
                });
            });
        });
    });
});
