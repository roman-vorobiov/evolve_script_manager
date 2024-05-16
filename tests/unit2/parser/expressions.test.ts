import { describe, it, expect } from "vitest";
import { parseExpression as parse, valuesOf, sourceMapsOf } from "./fixture";

describe("Parser", () => {
    describe("Settings", () => {
        describe("Setting values", () => {
            describe("Constant literals", () => {
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
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("baz", { type: "Identifier", value: "baz" })
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
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("baz", { type: "Identifier", value: "baz" })
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
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("aaa, bbb, ccc", {
                            type: "List",
                            values: [
                                maps("aaa", { type: "Identifier", value: "aaa" }),
                                maps("bbb", { type: "Identifier", value: "bbb" }),
                                maps("ccc", { type: "Identifier", value: "ccc" }),
                            ]
                        })
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                });

                it("should parse a list of identifiers (disjunction)", () => {
                    const { nodes, errors, maps } = parse("bar[aaa, bbb or ccc]");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    const expectedNode = maps("bar[aaa, bbb or ccc]", {
                        type: "Subscript",
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("aaa, bbb or ccc", {
                            type: "List",
                            values: [
                                maps("aaa", { type: "Identifier", value: "aaa" }),
                                maps("bbb", { type: "Identifier", value: "bbb" }),
                                maps("ccc", { type: "Identifier", value: "ccc" }),
                            ],
                            fold: "or"
                        })
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                });

                it("should parse a list of identifiers (conjunction)", () => {
                    const { nodes, errors, maps } = parse("bar[aaa, bbb and ccc]");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    const expectedNode = maps("bar[aaa, bbb and ccc]", {
                        type: "Subscript",
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("aaa, bbb and ccc", {
                            type: "List",
                            values: [
                                maps("aaa", { type: "Identifier", value: "aaa" }),
                                maps("bbb", { type: "Identifier", value: "bbb" }),
                                maps("ccc", { type: "Identifier", value: "ccc" }),
                            ],
                            fold: "and"
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
                        base: maps("aaa", { type: "Identifier", value: "aaa" }),
                        key: maps("bbb[ccc.ddd]", {
                            type: "Subscript",
                            base: maps("bbb", { type: "Identifier", value: "bbb" }),
                            key: maps("ccc.ddd", {
                                type: "Subscript",
                                base: maps("ccc", { type: "Identifier", value: "ccc" }),
                                key: maps("ddd", { type: "Identifier", value: "ddd" })
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
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("aaa.bbb, ccc[ddd, eee]", {
                            type: "List",
                            values: [
                                maps("aaa.bbb", {
                                    type: "Subscript",
                                    base: maps("aaa", { type: "Identifier", value: "aaa" }),
                                    key: maps("bbb", { type: "Identifier", value: "bbb" })
                                }),
                                maps("ccc[ddd, eee]", {
                                    type: "Subscript",
                                    base: maps("ccc", { type: "Identifier", value: "ccc" }),
                                    key: maps("ddd, eee", {
                                        type: "List",
                                        values: [
                                            maps("ddd", { type: "Identifier", value: "ddd" }),
                                            maps("eee", { type: "Identifier", value: "eee" })
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
                        base: maps("bar", { type: "Identifier", value: "bar" }),
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
                        base: maps("bar", { type: "Identifier", value: "bar" }),
                        key: maps("*", { type: "Wildcard" })
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                });
            });

            describe("Expressions", () => {
                it("should parse expression", () => {
                    const { nodes, errors, maps } = parse("bar + baz");

                    expect(errors).toStrictEqual([]);
                    expect(nodes.length).toBe(1);

                    const expectedNode = maps("bar + baz", {
                        type: "Expression",
                        operator: "+",
                        args: [
                            maps("bar", { type: "Identifier", value: "bar" }),
                            maps("baz", { type: "Identifier", value: "baz" })
                        ]
                    });

                    expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
                    expect(sourceMapsOf(nodes[0])).toEqual(sourceMapsOf(expectedNode));
                });
            });
        });
    });
});
