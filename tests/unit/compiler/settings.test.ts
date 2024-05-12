import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation } from "$lib/core/dsl/parser/utils";
import { makeDummyLocation, withDummyLocation, makeSettingId } from "./fixture";

import type { SettingAssignment } from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
    describe("Simple setting assignment", () => {
        it("should transform valid settings", () => {
            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("autoBuild"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("SettingAssignment");
            if (statements[0].type === "SettingAssignment") {
                expect(statements[0].setting).toBe("autoBuild");
                expect(statements[0].value).toBe(true);
            }
        });

        it("should reject invalid settings", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId(withLocation(location, "hello")),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown setting 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject mismatched setting type", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("autoBuild"),
                value: withLocation(location, 123)
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Expected boolean, got number");
            expect(errors[0].location).toStrictEqual(location);
        });
    });

    describe("Compound setting assignment", () => {
        it("should transform valid settings", () => {
            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("Log", "prestige"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("SettingAssignment");
            if (statements[0].type === "SettingAssignment") {
                expect(statements[0].setting).toBe("log_prestige");
                expect(statements[0].value).toBe(true);
            }
        });

        it("should expand wildcards", () => {
            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: withDummyLocation({
                    name: withDummyLocation("FleetPriority"),
                    targets: [],
                    wildcard: withDummyLocation(true)
                }),
                value: withDummyLocation(123)
            });

            const systems = [
                "gxy_stargate",
                "gxy_alien2",
                "gxy_alien1",
                "gxy_chthonian",
                "gxy_gateway",
                "gxy_gorddon",
            ];

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(systems.length);

            for (const [i, system] of systems.entries()) {
                const statement = statements[i];

                expect(statement.type).toBe("SettingAssignment");
                if (statement.type === "SettingAssignment") {
                    expect(statement.setting).toBe(`fleet_pr_${system}`);
                    expect(statement.value).toBe(123);
                }
            }
        });

        it("should reject invalid prefix", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId(withLocation(location, "hello"), "prestige"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown setting prefix 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid suffix", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("Log", withLocation(location, "prestigea")),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown log category 'prestigea'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should unwrap valid setting lists", () => {
            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("AutoSell", "Lumber", "Stone"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(2);

            expect(statements[0].type).toBe("SettingAssignment");
            if (statements[0].type === "SettingAssignment") {
                expect(statements[0].setting).toBe("sellLumber");
                expect(statements[0].value).toBe(true);
            }

            expect(statements[1].type).toBe("SettingAssignment");
            if (statements[1].type === "SettingAssignment") {
                expect(statements[1].setting).toBe("sellStone");
                expect(statements[1].value).toBe(true);
            }
        });

        it("should reject invalid suffix in a list", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("AutoSell", withLocation(location, "hello"), "Stone"),
                value: withDummyLocation(true)
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown resource 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });

    describe("Expression assignments", () => {
        it("should transform expressions", () => {
            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("BuildingMax", "interstellar-habitat"),
                value: withDummyLocation({
                    name: withDummyLocation("BuildingCount"),
                    targets: [withDummyLocation("interstellar-fusion")]
                })
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0]).toStrictEqual({
                type: "Override",
                target: "bld_m_interstellar-habitat",
                value: null,
                condition: {
                    op: "A?B",
                    left: { type: "Boolean", value: true },
                    right: { type: "BuildingCount", value: "interstellar-fusion" }
                }
            });
        });

        it("should reject expressions of a different type", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<SettingAssignment> {
                type: "SettingAssignment",
                setting: makeSettingId("BuildingMax", "interstellar-habitat"),
                value: withLocation(location, {
                    name: withDummyLocation("BuildingUnlocked"),
                    targets: [withDummyLocation("interstellar-fusion")]
                })
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Expected number, got boolean");
            expect(errors[0].location).toStrictEqual(location);
        });
    });
});
