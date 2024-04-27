import { describe, it, expect } from "vitest";
import { normalize } from "$lib/core/dsl/compiler/normalize";
import { withLocation } from "$lib/core/dsl/parser/utils";
import type { SettingAssignment, SourceLocation, SourceTracked } from "$lib/core/dsl/parser/model";

function makeDummyLocation(id = 0): SourceLocation {
    return {
        start: { line: 0, column: id },
        stop: { line: 0, column: id },
    };
}

function withDummyLocation<T>(value: T, id = 0) {
    return withLocation(makeDummyLocation(id), value);
}

describe("Compiler", () => {
    describe("Normalization", () => {
        describe("Simple setting assignment", () => {
            it("should transform valid settings", () => {
                const node: SourceTracked<SettingAssignment> = {
                    type: "SettingAssignment",
                    location: makeDummyLocation(),
                    setting: {
                        name: withDummyLocation("autoBuild")
                    },
                    value: withDummyLocation(true)
                };

                const { statements, errors } = normalize([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(1);

                expect(statements[0].type).toBe("SettingAssignment");
                expect(statements[0].setting).toBe("autoBuild");
                expect(statements[0].value).toBe(true);
            });

            it("should refuse invalid settings", () => {
                const settingLocation = makeDummyLocation(123);

                const node: SourceTracked<SettingAssignment> = {
                    type: "SettingAssignment",
                    location: makeDummyLocation(),
                    setting: {
                        name: withLocation(settingLocation, "hello")
                    },
                    value: withDummyLocation(true)
                };

                const { statements, errors } = normalize([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown setting 'hello'");
                expect(errors[0].location).toStrictEqual(settingLocation);
            });
        });

        describe("Compound setting assignment", () => {
            it("should transform valid settings", () => {
                const node: SourceTracked<SettingAssignment> = {
                    type: "SettingAssignment",
                    location: makeDummyLocation(),
                    setting: {
                        expression: {
                            name: withDummyLocation("Log"),
                            argument: withDummyLocation("prestige")
                        }
                    },
                    value: withDummyLocation(true)
                };

                const { statements, errors } = normalize([node]);

                expect(errors).toStrictEqual([]);
                expect(statements.length).toBe(1);

                expect(statements[0].type).toBe("SettingAssignment");
                expect(statements[0].setting).toBe("log_prestige");
                expect(statements[0].value).toBe(true);
            });

            it("should refuse invalid prefix", () => {
                const prefixLocation = makeDummyLocation(123);

                const node: SourceTracked<SettingAssignment> = {
                    type: "SettingAssignment",
                    location: makeDummyLocation(),
                    setting: {
                        expression: {
                            name: withLocation(prefixLocation, "hello"),
                            argument: withDummyLocation("prestige")
                        }
                    },
                    value: withDummyLocation(true)
                };

                const { statements, errors } = normalize([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown setting prefix 'hello'");
                expect(errors[0].location).toStrictEqual(prefixLocation);
            });

            it("should refuse invalid suffix", () => {
                const suffixLocation = makeDummyLocation(123);

                const node: SourceTracked<SettingAssignment> = {
                    type: "SettingAssignment",
                    location: makeDummyLocation(),
                    setting: {
                        expression: {
                            name: withDummyLocation("Log"),
                            argument: withLocation(suffixLocation, "prestigea")
                        }
                    },
                    value: withDummyLocation(true)
                };

                const { statements, errors } = normalize([node]);

                expect(statements).toStrictEqual([]);
                expect(errors.length).toBe(1);

                expect(errors[0].message).toBe("Unknown setting 'log_prestigea'");
                expect(errors[0].location).toStrictEqual(suffixLocation);
            });
        });
    });
});
