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

            expect(errors[0].message).toBe("Unknown setting 'log_prestigea'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });
});
