import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation, makeDummyLocation, withDummyLocation } from "./fixture";
import type { SettingAssignment, SourceTracked } from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
    describe("Simple setting assignment", () => {
        it("should transform valid settings", () => {
            const node: SourceTracked<SettingAssignment> = {
                type: "SettingAssignment",
                location: makeDummyLocation(),
                setting: {
                    name: withDummyLocation("autoBuild"),
                    arguments: []
                },
                value: withDummyLocation(true)
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("SettingAssignment");
            if (statements[0].type === "SettingAssignment") {
                expect(statements[0].setting).toBe("autoBuild");
                expect(statements[0].value).toBe(true);
            }
        });

        it("should refuse invalid settings", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<SettingAssignment> = {
                type: "SettingAssignment",
                location: makeDummyLocation(),
                setting: {
                    name: withLocation(location, "hello"),
                    arguments: []
                },
                value: withDummyLocation(true)
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown setting 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });

    describe("Compound setting assignment", () => {
        it("should transform valid settings", () => {
            const node: SourceTracked<SettingAssignment> = {
                type: "SettingAssignment",
                location: makeDummyLocation(),
                setting: {
                    name: withDummyLocation("Log"),
                    arguments: [withDummyLocation("prestige")]
                },
                value: withDummyLocation(true)
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("SettingAssignment");
            if (statements[0].type === "SettingAssignment") {
                expect(statements[0].setting).toBe("log_prestige");
                expect(statements[0].value).toBe(true);
            }
        });

        it("should refuse invalid prefix", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<SettingAssignment> = {
                type: "SettingAssignment",
                location: makeDummyLocation(),
                setting: {
                    name: withLocation(location, "hello"),
                    arguments: [withDummyLocation("prestige")]
                },
                value: withDummyLocation(true)
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown setting prefix 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid suffix", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<SettingAssignment> = {
                type: "SettingAssignment",
                location: makeDummyLocation(),
                setting: {
                    name: withDummyLocation("Log"),
                    arguments: [withLocation(location, "prestigea")]
                },
                value: withDummyLocation(true)
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown setting 'log_prestigea'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });
});
