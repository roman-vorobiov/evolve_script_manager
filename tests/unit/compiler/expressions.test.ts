import { describe, it, expect } from "vitest";
import { toEvalString, makeExpressionArgument, makeOverrideCondition } from "$lib/core/dsl/compiler/expressions";
import { withDummyLocation } from "./fixture";

import type * as Parser from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
    describe("Expressions", () => {
        describe("Eval transformation", () => {
            it("should transform numeric constants", () => {
                expect(toEvalString(new Number(-1.23))).toBe("-1.23");
            });

            it("should transform boolean constants", () => {
                expect(toEvalString(new Boolean(true))).toBe("true");
            });

            it("should transform string constants", () => {
                expect(toEvalString(new String("hello"))).toBe('"hello"');
            });

            it("should transform identifiers", () => {
                const node: Parser.Identifier = {
                    name: withDummyLocation("RacePillared"),
                    targets: [withDummyLocation("Imitation")]
                };
                expect(toEvalString(node)).toBe('checkTypes.RacePillared.fn("srace")');
            });

            it("should transform 'other' identifiers", () => {
                const node: Parser.Identifier = {
                    name: withDummyLocation("RaceName"),
                    targets: []
                };
                expect(toEvalString(node)).toBe('checkTypes.Other.fn("rname")');
            });

            it("should transform unary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            name: withDummyLocation("RacePillared"),
                            targets: [withDummyLocation("Imitation")]
                        })
                    ]
                };
                expect(toEvalString(node)).toBe('!checkTypes.RacePillared.fn("srace")');
            });

            it("should transform binary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("<"),
                    args: [
                        withDummyLocation({
                            name: withDummyLocation("BuildingCount"),
                            targets: [withDummyLocation("city-oil_depot")]
                        }),
                        withDummyLocation(123)
                    ]
                };
                expect(toEvalString(node)).toBe('checkTypes.BuildingCount.fn("city-oil_depot") < 123');
            });

            it("should transform nested expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("BuildingCount"),
                                    targets: [withDummyLocation("city-oil_depot")]
                                }),
                                withDummyLocation({
                                    operator: withDummyLocation("*"),
                                    args: [
                                        withDummyLocation({
                                            name: withDummyLocation("JobCount"),
                                            targets: [withDummyLocation("lumberjack")]
                                        }),
                                        withDummyLocation(2)
                                    ]
                                })
                            ]
                        })
                    ]
                };
                expect(toEvalString(node)).toBe('!(checkTypes.BuildingCount.fn("city-oil_depot") < (checkTypes.JobCount.fn("lumberjack") * 2))');
            });
        });

        describe("Argument transformation", () => {
            it("should compile numeric constants", () => {
                const result = makeExpressionArgument(new Number(-1.23));

                expect(result.type).toBe("Number");
                expect(result.value).toBe(-1.23);
            });

            it("should compile boolean constants", () => {
                const result = makeExpressionArgument(new Boolean(true));

                expect(result.type).toBe("Boolean");
                expect(result.value).toBe(true);
            });

            it("should compile string constants", () => {
                const result = makeExpressionArgument(new String("hello"));

                expect(result.type).toBe("String");
                expect(result.value).toBe("hello");
            });

            it("should compile identifiers", () => {
                const node: Parser.Identifier = {
                    name: withDummyLocation("ResourceDemanded"),
                    targets: [withDummyLocation("Lumber")]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("ResourceDemanded");
                expect(result.value).toBe("Lumber");
            });

            it.each([
                { source: "Imitation", target: "srace" },
                { source: "protoplasm", target: "protoplasm" }
            ])("should compile aliased identifiers (RacePillared $source -> $target)", ({ source, target }) => {
                const node: Parser.Identifier = {
                    name: withDummyLocation("RacePillared"),
                    targets: [withDummyLocation(source)]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("RacePillared");
                expect(result.value).toBe(target);
            });

            it("should compile 'other' identifiers", () => {
                const node: Parser.Identifier = {
                    name: withDummyLocation("RaceName"),
                    targets: []
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Other");
                expect(result.value).toBe("rname");
            });

            it("should compile unary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            name: withDummyLocation("RacePillared"),
                            targets: [withDummyLocation("Imitation")]
                        })
                    ]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe('!checkTypes.RacePillared.fn("srace")');
            });

            it("should compile binary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("<"),
                    args: [
                        withDummyLocation({
                            name: withDummyLocation("BuildingCount"),
                            targets: [withDummyLocation("city-oil_depot")]
                        }),
                        withDummyLocation(123)
                    ]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe('checkTypes.BuildingCount.fn("city-oil_depot") < 123');
            });

            it("should compile nested expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("BuildingCount"),
                                    targets: [withDummyLocation("city-oil_depot")]
                                }),
                                withDummyLocation({
                                    operator: withDummyLocation("*"),
                                    args: [
                                        withDummyLocation({
                                            name: withDummyLocation("JobCount"),
                                            targets: [withDummyLocation("lumberjack")]
                                        }),
                                        withDummyLocation(2)
                                    ]
                                })
                            ]
                        })
                    ]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe('!(checkTypes.BuildingCount.fn("city-oil_depot") < (checkTypes.JobCount.fn("lumberjack") * 2))');
            });
        });

        describe("Condition transformation", () => {
            it("should compile identifiers", () => {
                const node = withDummyLocation(<Parser.Identifier> {
                    name: withDummyLocation("ResourceDemanded"),
                    targets: [withDummyLocation("Lumber")]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("ResourceDemanded");
                expect(result.left.value).toBe("Lumber");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it("should compile aliased identifiers (RacePillared $source -> $target)", () => {
                const node = withDummyLocation(<Parser.Identifier> {
                    name: withDummyLocation("RacePillared"),
                    targets: [withDummyLocation("Imitation")]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("RacePillared");
                expect(result.left.value).toBe("srace");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it("should compile 'other' identifiers", () => {
                const node = withDummyLocation(<Parser.Identifier> {
                    name: withDummyLocation("RaceName"),
                    targets: []
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("Other");
                expect(result.left.value).toBe("rname");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it("should compile unary expressions", () => {
                const node =withDummyLocation(<Parser.EvaluatedExpression> {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            name: withDummyLocation("RacePillared"),
                            targets: [withDummyLocation("Imitation")]
                        })
                    ]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("RacePillared");
                expect(result.left.value).toBe("srace");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(false);
            });

            it("should compile binary expressions", () => {
                const node = withDummyLocation(<Parser.EvaluatedExpression> {
                    operator: withDummyLocation("<"),
                    args: [
                        withDummyLocation({
                            name: withDummyLocation("BuildingCount"),
                            targets: [withDummyLocation("city-oil_depot")]
                        }),
                        withDummyLocation(123)
                    ]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("<");
                expect(result.left.type).toBe("BuildingCount");
                expect(result.left.value).toBe("city-oil_depot");
                expect(result.right.type).toBe("Number");
                expect(result.right.value).toBe(123);
            });

            it("should compile nested expressions", () => {
                const node = withDummyLocation(<Parser.EvaluatedExpression> {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                withDummyLocation({
                                    name: withDummyLocation("BuildingCount"),
                                    targets: [withDummyLocation("city-oil_depot")]
                                }),
                                withDummyLocation({
                                    operator: withDummyLocation("*"),
                                    args: [
                                        withDummyLocation({
                                            name: withDummyLocation("JobCount"),
                                            targets: [withDummyLocation("lumberjack")]
                                        }),
                                        withDummyLocation(2)
                                    ]
                                })
                            ]
                        })
                    ]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("Eval");
                expect(result.left.value).toBe('checkTypes.BuildingCount.fn("city-oil_depot") < (checkTypes.JobCount.fn("lumberjack") * 2)');
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(false);
            });
        });
    });
});
