import { describe, it, expect } from "vitest";
import { processStatements, getExcepion } from "./fixture";
import { collectLogFilterStrings as collectLogFilterStringsImpl } from "$lib/core/dsl/compiler/logFilter";
import { CompileError } from "$lib/core/dsl/model";

import type * as Parser from "$lib/core/dsl/model/7";

const collectLogFilterStrings = (nodes: Parser.Statement[]) => processStatements(nodes, collectLogFilterStringsImpl);

describe("Compiler", () => {
    describe("Log filter", () => {
        it("should push strings", () => {
            const node1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "foo" }
            };

            const node2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "bar%baz" }
            };

            const { nodes } = collectLogFilterStrings([node1, node2]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "logFilter" },
                value: { type: "String", value: "foo, bar%baz" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should pop strings", () => {
            const node1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "foo" }
            };

            const node2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "bar%baz" }
            };

            const node3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: ">>",
                value: { type: "String", value: "foo" }
            };

            const { nodes } = collectLogFilterStrings([node1, node2, node3]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "logFilter" },
                value: { type: "String", value: "bar%baz" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should not pop non-existent strings", () => {
            const node1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "foo" }
            };

            const node2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: ">>",
                value: { type: "String", value: "hello" }
            };

            const node3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "bar%baz" }
            };

            const { nodes } = collectLogFilterStrings([node1, node2, node3]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingAssignment = {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "logFilter" },
                value: { type: "String", value: "foo, bar%baz" }
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should ignore other settings", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                value: { type: "String", value: "foo" }
            };

            const { nodes } = collectLogFilterStrings([originalNode]);
            expect(nodes.length).toEqual(1);

            expect(nodes[0]).toBe(originalNode);
        });

        it("should throw on non-string values", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "Identifier", value: "foo" } as any
            };

            const error = getExcepion(() => collectLogFilterStrings([originalNode]));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("String expected");
                expect(error.offendingEntity).toBe(originalNode.value);
            }
        });

        it("should throw on conditions", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                value: { type: "String", value: "foo" },
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const error = getExcepion(() => collectLogFilterStrings([originalNode]));
            expect(error).toBeInstanceOf(CompileError);
            if (error instanceof CompileError) {
                expect(error.message).toEqual("Log filter cannot be set conditionally");
                expect(error.offendingEntity).toBe(originalNode.condition);
            }
        });
    });
});
