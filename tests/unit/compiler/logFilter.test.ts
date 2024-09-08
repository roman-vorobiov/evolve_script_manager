import { describe, it, expect } from "vitest";
import { processStatements } from "./fixture";
import { collectLogFilterStrings as collectLogFilterStringsImpl } from "$lib/core/dsl/compiler/logFilter";

import type * as Parser from "$lib/core/dsl/model/7";

const collectLogFilterStrings = (nodes: Parser.Statement[]) => processStatements(nodes, collectLogFilterStringsImpl);

describe("Compiler", () => {
    describe("Log filter", () => {
        it("should ignore other settings", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const originalNode2: Parser.SettingShiftBlock = {
                type: "SettingShiftBlock",
                setting: { type: "Identifier", value: "evolutionQueue" },
                body: [
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "userEvolutionTarget" },
                        value: { type: "String", value: "foo" }
                    },
                    {
                        type: "SettingAssignment",
                        setting: { type: "Identifier", value: "prestigeType" },
                        value: { type: "String", value: "bar" }
                    }
                ]
            };

            const { nodes } = collectLogFilterStrings([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(2);

            expect(nodes[0]).toBe(originalNode2);
        });

        it("should push strings", () => {
            const node1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const node2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "bar%baz" }
                ]
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

        it("should process all values", () => {
            const node: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" },
                    { type: "String", value: "bar%baz" }
                ]
            };

            const { nodes } = collectLogFilterStrings([node]);
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
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const node2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "bar%baz" }
                ]
            };

            const node3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: ">>",
                values: [
                    { type: "String", value: "foo" }
                ]
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
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const node2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: ">>",
                values: [
                    { type: "String", value: "hello" }
                ]
            };

            const node3: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "bar%baz" }
                ]
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
                values: [
                    { type: "String", value: "foo" }
                ]
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
                values: [
                    { type: "Identifier", value: "foo" }
                ]
            };

            const { errors } = collectLogFilterStrings([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("String expected");
            expect(errors[0].offendingEntity).toBe(originalNode.values[0]);
        });

        it("should throw on conditions", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "logFilter" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { errors } = collectLogFilterStrings([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Log filter cannot be set conditionally");
            expect(errors[0].offendingEntity).toBe(originalNode.condition);
        });
    });
});
