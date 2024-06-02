import { describe, it, expect } from "vitest";
import { processStatements } from "./fixture";
import { buildEvolutionQueue as buildEvolutionQueueImpl } from "$lib/core/dsl/compiler/evolutionQueue";

import type * as Parser from "$lib/core/dsl/model/7";

const buildEvolutionQueue = (nodes: Parser.Statement[]) => processStatements(nodes, buildEvolutionQueueImpl);

describe("Compiler", () => {
    describe("Evolution queue", () => {
        it("should ignore other settings", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "researchIgnore" },
                operator: "<<",
                values: [
                    { type: "String", value: "foo" }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode]);
            expect(nodes.length).toEqual(1);

            expect(nodes[0]).toBe(originalNode);
        });

        it("should throw on conditions", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "mad" }
                ],
                condition: {
                    type: "Subscript",
                    base: { type: "Identifier", value: "ResourceDemanded" },
                    key: { type: "Identifier", value: "Copper" }
                }
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Evolution queue cannot be set conditionally");
            expect(errors[0].offendingEntity).toBe(originalNode.condition);
        });

        it("should throw on pop", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: ">>",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "mad" }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Only the push operation is supported for 'evolutionQueue'");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });

        it("should throw on missing reset type", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Target reset type is not specified");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });

        it("should throw on missing target race", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Target race is not specified");
            expect(errors[0].offendingEntity).toBe(originalNode);
        });

        it("should throw on strings", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "String", value: "mad" }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Identifier expected");
            expect(errors[0].offendingEntity).toBe(originalNode.values[1]);
        });

        it("should throw on invalid races", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "hello" },
                    { type: "Identifier", value: "mad" }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown race 'hello'");
            expect(errors[0].offendingEntity).toBe(originalNode.values[0]);
        });

        it("should throw on invalid reset types", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "hello" }
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown reset type 'hello'");
            expect(errors[0].offendingEntity).toBe(originalNode.values[1]);
        });

        it("should throw on invalid challenges", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "mad" },
                    { type: "Identifier", value: "hello" },
                ]
            };

            const { errors } = buildEvolutionQueue([originalNode]);
            expect(errors.length).toEqual(1);

            expect(errors[0].message).toEqual("Unknown challenge 'hello'");
            expect(errors[0].offendingEntity).toBe(originalNode.values[2]);
        });

        it("should generate settings with no challenges", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "mad" }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingPush = {
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: [
                    {
                        targetRace: "auto",
                        resetType: "mad",
                        challenges: []
                    }
                ]
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should generate settings with challenges", () => {
            const originalNode: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "mad" },
                    { type: "Identifier", value: "trade" }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingPush = {
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: [
                    {
                        targetRace: "auto",
                        resetType: "mad",
                        challenges: ["trade"]
                    }
                ]
            };

            expect(nodes[0]).toEqual(expectedNode);
        });

        it("should join multiple statements", () => {
            const originalNode1: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "auto" },
                    { type: "Identifier", value: "mad" },
                    { type: "Identifier", value: "trade" }
                ]
            };

            const originalNode2: Parser.SettingShift = {
                type: "SettingShift",
                setting: { type: "Identifier", value: "evolutionQueue" },
                operator: "<<",
                values: [
                    { type: "Identifier", value: "cath" },
                    { type: "Identifier", value: "ascension" }
                ]
            };

            const { nodes } = buildEvolutionQueue([originalNode1, originalNode2]);
            expect(nodes.length).toEqual(1);

            const expectedNode: Parser.SettingPush = {
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: [
                    {
                        targetRace: "auto",
                        resetType: "mad",
                        challenges: ["trade"]
                    },
                    {
                        targetRace: "cath",
                        resetType: "ascension",
                        challenges: []
                    }
                ]
            };

            expect(nodes[0]).toEqual(expectedNode);
        });
    });
});
