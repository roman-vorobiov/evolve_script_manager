import { describe, it, expect } from "vitest";
import { toEvalString, makeExpressionArgument, makeOverrideCondition } from "$lib/core/dsl/compiler/expressions";
import { makeIdentifier, withDummyLocation } from "./fixture";

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
                expect(toEvalString(new String("hello"))).toBe("'hello'");
            });

            it("should transform identifiers", () => {
                const node = makeIdentifier("RacePillared", "Imitation");
                expect(toEvalString(node)).toBe("_('RacePillared', 'srace')");
            });

            it("should transform 'other' identifiers", () => {
                const node = makeIdentifier("RaceName");
                expect(toEvalString(node)).toBe("_('Other', 'rname')");
            });

            it("should not transform eval expressions", () => {
                const node = makeIdentifier("Eval", "a || b");
                expect(toEvalString(node)).toBe("a || b");
            });

            it("should transform unary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        makeIdentifier("RacePillared", "Imitation")
                    ]
                };
                expect(toEvalString(node)).toBe("!_('RacePillared', 'srace')");
            });

            it("should transform binary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("<"),
                    args: [
                        makeIdentifier("BuildingCount", "city-oil_depot"),
                        withDummyLocation(123)
                    ]
                };
                expect(toEvalString(node)).toBe("_('BuildingCount', 'city-oil_depot') < 123");
            });

            it("should transform nested expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            operator: withDummyLocation("and"),
                            args: [
                                makeIdentifier("BuildingUnlocked", "city-oil_depot"),
                                withDummyLocation({
                                    operator: withDummyLocation("or"),
                                    args: [
                                        makeIdentifier("JobUnlocked", "lumberjack"),
                                        makeIdentifier("ResearchUnlocked", "tech-club")
                                    ]
                                })
                            ]
                        })
                    ]
                };
                expect(toEvalString(node)).toBe("!(_('BuildingUnlocked', 'city-oil_depot') && " +
                                                  "(_('JobUnlocked', 'lumberjack') || " +
                                                   "_('ResearchUnlocked', 'tech-club')))");
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
                const node = makeIdentifier("ResourceDemanded", "Lumber");

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("ResourceDemanded");
                expect(result.value).toBe("Lumber");
            });

            it.each([
                { source: "Imitation", target: "srace" },
                { source: "protoplasm", target: "protoplasm" }
            ])("should compile aliased identifiers (RacePillared $source -> $target)", ({ source, target }) => {
                const node = makeIdentifier("RacePillared", source);

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("RacePillared");
                expect(result.value).toBe(target);
            });

            it("should compile 'other' identifiers", () => {
                const node = makeIdentifier("RaceName");

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Other");
                expect(result.value).toBe("rname");
            });

            it("should compile eval expressions", () => {
                const node = makeIdentifier("Eval", "a || b");

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe("a || b");
            });

            it("should compile unary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        makeIdentifier("RacePillared", "Imitation")
                    ]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe("!_('RacePillared', 'srace')");
            });

            it("should compile binary expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("<"),
                    args: [
                        makeIdentifier("BuildingCount", "city-oil_depot"),
                        withDummyLocation(123)
                    ]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe("_('BuildingCount', 'city-oil_depot') < 123");
            });

            it("should compile nested expressions", () => {
                const node: Parser.EvaluatedExpression = {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                makeIdentifier("BuildingCount", "city-oil_depot"),
                                withDummyLocation({
                                    operator: withDummyLocation("*"),
                                    args: [
                                        makeIdentifier("JobCount", "lumberjack"),
                                        withDummyLocation(2)
                                    ]
                                })
                            ]
                        })
                    ]
                };

                const result = makeExpressionArgument(node);

                expect(result.type).toBe("Eval");
                expect(result.value).toBe("!(_('BuildingCount', 'city-oil_depot') < (_('JobCount', 'lumberjack') * 2))");
            });
        });

        describe("Condition transformation", () => {
            it("should compile identifiers", () => {
                const node = makeIdentifier("ResourceDemanded", "Lumber");

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("ResourceDemanded");
                expect(result.left.value).toBe("Lumber");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it.each([
                { source: "Imitation", target: "srace" },
                { source: "protoplasm", target: "protoplasm" }
            ])("should compile aliased identifiers (RacePillared $source -> $target)", () => {
                const node = makeIdentifier("RacePillared", "Imitation");

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("RacePillared");
                expect(result.left.value).toBe("srace");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it("should compile 'other' identifiers", () => {
                const node = makeIdentifier("RaceName");

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("Other");
                expect(result.left.value).toBe("rname");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it("should compile eval expressions", () => {
                const node = makeIdentifier("Eval", "a || b");

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("Eval");
                expect(result.left.value).toBe("a || b");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(true);
            });

            it("should compile unary expressions", () => {
                const node =withDummyLocation(<Parser.EvaluatedExpression> {
                    operator: withDummyLocation("not"),
                    args: [
                        makeIdentifier("RacePillared", "Imitation")
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
                    operator: withDummyLocation("and"),
                    args: [
                        makeIdentifier("BuildingUnlocked", "city-oil_depot"),
                        makeIdentifier("ResearchUnlocked", "tech-club")
                    ]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("AND");
                expect(result.left.type).toBe("BuildingUnlocked");
                expect(result.left.value).toBe("city-oil_depot");
                expect(result.right.type).toBe("ResearchUnlocked");
                expect(result.right.value).toBe("tech-club");
            });

            it("should compile nested expressions", () => {
                const node = withDummyLocation(<Parser.EvaluatedExpression> {
                    operator: withDummyLocation("not"),
                    args: [
                        withDummyLocation({
                            operator: withDummyLocation("<"),
                            args: [
                                makeIdentifier("BuildingCount", "city-oil_depot"),
                                withDummyLocation({
                                    operator: withDummyLocation("*"),
                                    args: [
                                        makeIdentifier("JobCount", "lumberjack"),
                                        withDummyLocation({
                                            operator: withDummyLocation("/"),
                                            args: [
                                                makeIdentifier("Eval", "2"),
                                                withDummyLocation(3)
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                });

                const result = makeOverrideCondition(node);

                expect(result.op).toBe("==");
                expect(result.left.type).toBe("Eval");
                expect(result.left.value).toBe("_('BuildingCount', 'city-oil_depot') < (_('JobCount', 'lumberjack') * ((2) / 3))");
                expect(result.right.type).toBe("Boolean");
                expect(result.right.value).toBe(false);
            });
        });
    });
});
