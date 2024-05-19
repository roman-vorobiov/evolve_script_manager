import { describe, it, expect } from "vitest";
import { parseExpression as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Expressions", () => {
        describe("Literals", () => {
            it.each([
                { source: '"123"', type: "String",  target: "123" },
                { source: "123",   type: "Number",  target: 123 },
                { source: "-123",  type: "Number",  target: -123 },
                { source: "1.23",  type: "Number",  target: 1.23 },
                { source: "-1.23", type: "Number",  target: -1.23 },
                { source: "ON",    type: "Boolean", target: true },
                { source: "OFF",   type: "Boolean", target: false },
            ])("should parse constants: $source as $target", ({ source, target, type }) => {
                const { nodes, errors, maps } = parse(source);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps(source, { type, value: target })

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse small eval literals", () => {
                const { nodes, errors, maps } = parse('{    aaa.bbb #   "    }');

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps('{    aaa.bbb #   "    }', {
                    type: "Eval",
                    value: 'aaa.bbb #   "'
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse big eval literals", () => {
                const { nodes, errors, maps } = parse('{{ { a: "b" } == { c: "d" } }}');

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps('{{ { a: "b" } == { c: "d" } }}', {
                    type: "Eval",
                    value: '{ a: "b" } == { c: "d" }'
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });
        });

        describe("Identifiers", () => {
            it("should parse identifiers", () => {
                const { nodes, errors, maps } = parse("bar");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar", { type: "Identifier", value: "bar" });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });
        });

        describe("Subscript", () => {
            it("should parse 'identifier.identifier'", () => {
                const { nodes, errors, maps } = parse("bar.baz");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar.baz", {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps.identifier("baz")
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse 'identifier[identifier]'", () => {
                const { nodes, errors, maps } = parse("bar[baz]");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar[baz]", {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps.identifier("baz")
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse a list of identifiers", () => {
                const { nodes, errors, maps } = parse("bar[aaa, bbb, ccc]");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar[aaa, bbb, ccc]", {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps("aaa, bbb, ccc", {
                        type: "List",
                        values: [
                            maps.identifier("aaa"),
                            maps.identifier("bbb"),
                            maps.identifier("ccc"),
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it.each(["and", "or"])("should parse a list of identifiers (folded with '%s')", (fold) => {
                const { nodes, errors, maps } = parse(`bar[aaa, bbb ${fold} ccc]`);

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps(`bar[aaa, bbb ${fold} ccc]`, {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps(`aaa, bbb ${fold} ccc`, {
                        type: "List",
                        values: [
                            maps.identifier("aaa"),
                            maps.identifier("bbb"),
                            maps.identifier("ccc"),
                        ],
                        fold: fold
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse nested subscripts", () => {
                const { nodes, errors, maps } = parse("aaa[bbb[ccc.ddd]]");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("aaa[bbb[ccc.ddd]]", {
                    type: "Subscript",
                    base: maps.identifier("aaa"),
                    key: maps("bbb[ccc.ddd]", {
                        type: "Subscript",
                        base: maps.identifier("bbb"),
                        key: maps("ccc.ddd", {
                            type: "Subscript",
                            base: maps.identifier("ccc"),
                            key: maps.identifier("ddd")
                        })
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse a list of nested subscripts", () => {
                const { nodes, errors, maps } = parse("bar[aaa.bbb, ccc[ddd, eee]]");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar[aaa.bbb, ccc[ddd, eee]]", {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps("aaa.bbb, ccc[ddd, eee]", {
                        type: "List",
                        values: [
                            maps("aaa.bbb", {
                                type: "Subscript",
                                base: maps.identifier("aaa"),
                                key: maps.identifier("bbb")
                            }),
                            maps("ccc[ddd, eee]", {
                                type: "Subscript",
                                base: maps.identifier("ccc"),
                                key: maps("ddd, eee", {
                                    type: "List",
                                    values: [
                                        maps.identifier("ddd"),
                                        maps.identifier("eee")
                                    ]
                                })
                            })
                        ]
                    })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse placeholders", () => {
                const { nodes, errors, maps } = parse("bar[...]");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar[...]", {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps("...", { type: "Placeholder" })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse wildcards", () => {
                const { nodes, errors, maps } = parse("bar[*]");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("bar[*]", {
                    type: "Subscript",
                    base: maps.identifier("bar"),
                    key: maps("*", { type: "Wildcard" })
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });
        });

        describe("Compound expressions", () => {
            it("should parse unary expressions", () => {
                const { nodes, errors, maps } = parse("not foo");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("not foo", {
                    type: "Expression",
                    operator: "not",
                    args: [
                        maps.identifier("foo")
                    ]
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            it("should parse binary expressions", () => {
                const { nodes, errors, maps } = parse("foo < bar");

                expect(errors).toStrictEqual([]);
                expect(nodes.length).toBe(1);

                const expectedNode = maps("foo < bar", {
                    type: "Expression",
                    operator: "<",
                    args: [
                        maps.identifier("foo"),
                        maps.identifier("bar")
                    ]
                });

                expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
            });

            describe("Operator precedence", () => {
                it("should put quotes before anything else", () => {
                    const { nodes, errors, maps } = parse("not (aaa or bbb)");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    const expectedNode = maps("not (aaa or bbb)", {
                        type: "Expression",
                        operator: "not",
                        args: [
                            maps("aaa or bbb", {
                                type: "Expression",
                                operator: "or",
                                args: [
                                    maps.identifier("aaa"),
                                    maps.identifier("bbb")
                                ]
                            })
                        ]
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                });

                it("should put 'not' before '*'", () => {
                    const { nodes, errors, maps } = parse("not aaa * bbb");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    const expectedNode = maps("not aaa * bbb", {
                        type: "Expression",
                        operator: "*",
                        args: [
                            maps("not aaa", {
                                type: "Expression",
                                operator: "not",
                                args: [
                                    maps.identifier("aaa")
                                ]
                            }),
                            maps.identifier("bbb")
                        ]
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                });

                describe.each([
                    { first: "*", second: "+" },
                    { first: "+", second: ">" },
                    { first: ">", second: "==" },
                    { first: "==", second: "and" },
                    { first: "and", second: "or" },
                ])("should put $first before $second", ({first, second}) => {
                    it(`a ${second} b ${first} c ${second} d`, () => {
                        const { nodes, errors, maps } = parse(`aaa ${second} bbb ${first} ccc ${second} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        const expectedNode = maps(`aaa ${second} bbb ${first} ccc ${second} ddd`, {
                            type: "Expression",
                            operator: second,
                            args: [
                                maps(`aaa ${second} bbb ${first} ccc`, {
                                    type: "Expression",
                                    operator: second,
                                    args: [
                                        maps.identifier("aaa"),
                                        maps(`bbb ${first} ccc`, {
                                            type: "Expression",
                                            operator: first,
                                            args: [
                                                maps.identifier("bbb"),
                                                maps.identifier("ccc")
                                            ]
                                        })
                                    ]
                                }),
                                maps.identifier("ddd")
                            ]
                        });

                        expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                        expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                    });

                    it(`a ${first} b ${second} c ${first} d`, () => {
                        const { nodes, errors, maps } = parse(`aaa ${first} bbb ${second} ccc ${first} ddd`);

                        expect(errors).toStrictEqual([]);
                        expect(nodes.length).toBe(1);

                        const expectedNode = maps(`aaa ${first} bbb ${second} ccc ${first} ddd`, {
                            type: "Expression",
                            operator: second,
                            args: [
                                maps(`aaa ${first} bbb`, {
                                    type: "Expression",
                                    operator: first,
                                    args: [
                                        maps.identifier("aaa"),
                                        maps.identifier("bbb")
                                    ]
                                }),
                                maps(`ccc ${first} ddd`, {
                                    type: "Expression",
                                    operator: first,
                                    args: [
                                        maps.identifier("ccc"),
                                        maps.identifier("ddd")
                                    ]
                                })
                            ]
                        });

                        expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                        expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
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
                    const { nodes, errors, maps } = parse(`aaa ${first} bbb ${second} ccc ${first} ddd`);

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    const expectedNode = maps(`aaa ${first} bbb ${second} ccc ${first} ddd`, {
                        type: "Expression",
                        operator: first,
                        args: [
                            maps(`aaa ${first} bbb ${second} ccc`, {
                                type: "Expression",
                                operator: second,
                                args: [
                                    maps(`aaa ${first} bbb`, {
                                        type: "Expression",
                                        operator: first,
                                        args: [
                                            maps.identifier("aaa"),
                                            maps.identifier("bbb")
                                        ]
                                    }),
                                    maps.identifier("ccc")
                                ]
                            }),
                            maps.identifier("ddd")
                        ]
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
               });
            });
        });
    });
});
