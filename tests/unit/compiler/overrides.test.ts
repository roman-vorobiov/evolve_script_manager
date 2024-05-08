import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withDummyLocation, makeSettingId, makeDummyLocation } from "./fixture";

import type { SettingAssignment } from "$lib/core/dsl/parser/model";
import { withLocation } from "$lib/core/dsl/parser/utils";

describe("Compiler", () => {
    describe("Conditions", () => {
        describe("Nullary", () => {
            describe("Expression type", () => {
                it("should reject non-boolean identifiers", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, {
                            name: withDummyLocation("ResourceQuantity"),
                            targets: [withDummyLocation("Morale")]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected boolean, got number");
                    expect(errors[0].location).toStrictEqual(location);
                });

                it("should reject non-boolean setting values", () => {
                    const location = makeDummyLocation(123);

                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withLocation(location, {
                            name: withDummyLocation("SettingCurrent"),
                            targets: [withDummyLocation("prestigeType")]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(statements).toStrictEqual([]);
                    expect(errors.length).toBe(1);

                    expect(errors[0].message).toBe("Expected boolean, got string");
                    expect(errors[0].location).toStrictEqual(location);
                });

                it("should accept boolean setting values", () => {
                    const node = withDummyLocation(<SettingAssignment> {
                        type: "SettingAssignment",
                        setting: makeSettingId("autoBuild"),
                        value: withDummyLocation(true),
                        condition: withDummyLocation({
                            name: withDummyLocation("SettingCurrent"),
                            targets: [withDummyLocation("autoPrestige")]
                        })
                    });

                    const { statements, errors } = compile([node]);

                    expect(errors).toStrictEqual([]);
                    expect(statements.length).toBe(1);

                    expect(statements[0]).toStrictEqual({
                        type: "Override",
                        target: "autoBuild",
                        value: true,
                        condition: {
                            op: "==",
                            left: { type: "SettingCurrent", value: "autoPrestige" },
                            right: { type: "Boolean", value: true }
                        }
                    });
                });
            });

            it("should accept valid identifiers", () => {
                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        name: withDummyLocation("ResourceDemanded"),
                        targets: [withDummyLocation("Lumber")]
                    })
                });

                const { statements, errors } = compile([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(1);

                expect(statements[0]).toStrictEqual({
                    type: "Override",
                    target: "autoBuild",
                    value: true,
                    condition: {
                        op: "==",
                        left: { type: "ResourceDemanded", value: "Lumber" },
                        right: { type: "Boolean", value: true }
                    }
                });
            });

            it.each([
                { prefix: "BuildingUnlocked", type: "building" },
                { prefix: "ResearchUnlocked", type: "tech" },
            ])("should reject mismatched suffixes", ({ prefix, type }) => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        name: withDummyLocation(prefix),
                        targets: [withLocation(location, "Morale")]
                    })
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe(`Unknown ${type} 'Morale'`);
                expect(errors[0].location).toStrictEqual(location);
            });

            it("should reject invalid prefixes", () => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withDummyLocation({
                        name: withLocation(location, "hello"),
                        targets: [withDummyLocation("Morale")]
                    })
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown expression type 'hello'");
                expect(errors[0].location).toStrictEqual(location);
            });

            it("should reject invalid 'other' expressions", () => {
                const location = makeDummyLocation(123);

                const node = withDummyLocation(<SettingAssignment> {
                    type: "SettingAssignment",
                    setting: makeSettingId("autoBuild"),
                    value: withDummyLocation(true),
                    condition: withLocation(location, {
                        name: withDummyLocation("hello"),
                        targets: []
                    })
                });

                const { statements, errors } = compile([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown expression 'hello'");
                expect(errors[0].location).toStrictEqual(location);
            });
        });
    });
});
