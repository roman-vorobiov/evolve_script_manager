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
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar"),
                    condition: maps("aaa.bbb", { name: maps("aaa"), targets: [maps("bbb")] })
                }));
            });

            it("should parse negated unary conditions", () => {
                const { nodes, errors, maps } = parse("foo = bar if not aaa.bbb");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                expect(nodes[0]).toStrictEqual(maps("foo = bar if not aaa.bbb", <SettingAssignment> {
                    type: "SettingAssignment",
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar"),
                    condition: maps("not aaa.bbb", {
                        operator: maps("not"),
                        args: [
                            maps("aaa.bbb", { name: maps("aaa"), targets: [maps("bbb")] })
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
                    setting: maps("foo", { name: maps("foo"), targets: [] }),
                    value: maps("bar"),
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
                    const { nodes, errors, maps } = parse("foo = bar if not (aaa or bbb)");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps("foo = bar if not (aaa or bbb)", <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), targets: [] }),
                        value: maps("bar"),
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
                    const { nodes, errors, maps } = parse("foo = bar if not aaa * bbb");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps("foo = bar if not aaa * bbb", <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), targets: [] }),
                        value: maps("bar"),
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
                        const { nodes, errors, maps } = parse(`foo = bar if aaa ${second} bbb ${first} ccc ${second} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        expect(nodes[0]).toStrictEqual(maps(`foo = bar if aaa ${second} bbb ${first} ccc ${second} ddd`, <SettingAssignment> {
                            type: "SettingAssignment",
                            setting: maps("foo", { name: maps("foo"), targets: [] }),
                            value: maps("bar"),
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
                        const { nodes, errors, maps } = parse(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        expect(nodes[0]).toStrictEqual(maps(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`, <SettingAssignment> {
                            type: "SettingAssignment",
                            setting: maps("foo", { name: maps("foo"), targets: [] }),
                            value: maps("bar"),
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
                    const { nodes, errors, maps } = parse(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`);

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    expect(nodes[0]).toStrictEqual(maps(`foo = bar if aaa ${first} bbb ${second} ccc ${first} ddd`, <SettingAssignment> {
                        type: "SettingAssignment",
                        setting: maps("foo", { name: maps("foo"), targets: [] }),
                        value: maps("bar"),
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
    });
});
