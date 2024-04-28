import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation } from "$lib/core/dsl/parser/utils";
import type { SettingAssignment, SourceLocation, SourceTracked, Trigger } from "$lib/core/dsl/parser/model";

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
                    name: withLocation(location, "hello")
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
                    expression: {
                        name: withDummyLocation("Log"),
                        argument: withDummyLocation("prestige")
                    }
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
                    expression: {
                        name: withLocation(location, "hello"),
                        argument: withDummyLocation("prestige")
                    }
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
                    expression: {
                        name: withDummyLocation("Log"),
                        argument: withLocation(location, "prestigea")
                    }
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

    describe("Triggers", () => {
        it("should transform valid triggers", () => {
            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withDummyLocation("city-oil_well")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].actionType).toBe("build");
                expect(statements[0].actionId).toBe("city-oil_well");
                expect(statements[0].actionCount).toBe(1);
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(1);
            }
        });

        it("should normalize arpa ids", () => {
            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Arpa"),
                    argument: withDummyLocation("lhc")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].actionType).toBe("arpa");
                expect(statements[0].actionId).toBe("arpalhc");
                expect(statements[0].actionCount).toBe(1);
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(1);
            }
        });

        it("should refuse mismatched condition/action types", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withDummyLocation("city-oil_well")
                },
                condition: {
                    name: withLocation(location, "Research"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown trigger condition 'Research'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid condition types", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withDummyLocation("city-oil_well")
                },
                condition: {
                    name: withLocation(location, "Hello"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown trigger condition 'Hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid condition ids", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withDummyLocation("city-oil_well")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withLocation(location, "hello")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown tech 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse mismatched condition type/id", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withDummyLocation("city-oil_well")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withLocation(location, "city-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown tech 'city-oil_well'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid action types", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withLocation(location, "Hello"),
                    argument: withDummyLocation("city-oil_well")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown trigger action 'Hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid action ids", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withLocation(location, "hello")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown building 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse mismatched action type/id", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: {
                    name: withDummyLocation("Build"),
                    argument: withLocation(location, "tech-oil_well")
                },
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withDummyLocation("tech-oil_well")
                }
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown building 'tech-oil_well'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });
});
