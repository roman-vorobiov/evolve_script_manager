import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation } from "$lib/core/dsl/parser/utils";
import { makeDummyLocation, withDummyLocation } from "./fixture";

import type { SourceTracked } from "$lib/core/dsl/parser/source";
import type { Identifier, SettingAssignment } from "$lib/core/dsl/parser/model";

function makeSettingId(
    name: string | SourceTracked<String>,
    suffix?: string | SourceTracked<String>
): SourceTracked<Identifier> {
    if (typeof name === "string") {
        name = withDummyLocation(name);
    }

    if (typeof suffix === "string") {
        suffix = withDummyLocation(suffix);
    }

    const node: Identifier = { name, targets: [] };

    if (suffix !== undefined) {
        node.targets.push(suffix);
    }

    return withDummyLocation(node);
}

describe("Compiler", () => {
    describe("Simple setting assignment", () => {
        it("should transform valid settings", () => {
            const node: SourceTracked<SettingAssignment> = {
                type: "SettingAssignment",
                location: makeDummyLocation(),
                setting: makeSettingId("autoBuild"),
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
                setting: makeSettingId(withLocation(location, "hello")),
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
                setting: makeSettingId("Log", "prestige"),
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
                setting: makeSettingId(withLocation(location, "hello"), "prestige"),
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
                setting: makeSettingId("Log", withLocation(location, "prestigea")),
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
