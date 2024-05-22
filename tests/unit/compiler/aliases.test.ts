import { describe, it, expect } from "vitest";
import { processStatement, valuesOf, originsOf, getExcepion } from "./fixture";
import { resolveAliases as resolveAliasesImpl } from "$lib/core/dsl/compiler/aliases";
import { CompileError } from "$lib/core/dsl/model";

import type * as Parser from "$lib/core/dsl/model/5";

const resolveAliases = (node: Parser.Statement) => processStatement(node, resolveAliasesImpl);

describe("Compiler", () => {
    describe("Aliases", () => {
        it("should resolve race aliases", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "RacePillared" },
                    key: { type: "Identifier", value: "Imitation" }
                }
            };

            const { nodes, from } = resolveAliases(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    key: from(originalNode.value.key, { value: "srace" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should ignore non-aliased race", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "RacePillared" },
                    key: { type: "Identifier", value: "Sludge" }
                }
            };

            const { nodes } = resolveAliases(originalNode as Parser.SettingAssignment);

            expect(nodes.length).toEqual(1);
            expect(nodes[0]).toBe(originalNode);
        });

        it("should resolve queue aliases", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "Queue" },
                    key: { type: "Identifier", value: "Research" }
                }
            };

            const { nodes, from } = resolveAliases(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    key: from(originalNode.value.key, { value: "r_queue" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should resolve 'Other' prefixes", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "SatelliteCost" }
            };

            const { nodes, from } = resolveAliases(originalNode as Parser.SettingAssignment);

            const expectedNode = from(originalNode, {
                value: from(originalNode.value, {
                    type: "Subscript",
                    base: from(originalNode.value, { type: "Identifier", value: "Other" }),
                    key: from(originalNode.value, { type: "Identifier", value: "satcost" })
                })
            });

            expect(nodes.length).toEqual(1);
            expect(valuesOf(nodes[0])).toEqual(valuesOf(expectedNode));
            expect(originsOf(nodes[0])).toEqual(originsOf(expectedNode));
        });

        it("should throw on unknown identifiers", () => {
            const originalNode = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "hello" },
                value: { type: "Identifier", value: "hello" }
            };

            const error = getExcepion(() => resolveAliases(originalNode as Parser.SettingAssignment));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Unexpected identifier 'hello'");
                expect(error.offendingEntity).toBe(originalNode.value);
            }
        });
    });
});
