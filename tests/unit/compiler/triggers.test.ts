import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation, makeDummyLocation, withDummyLocation } from "./fixture";
import type { SourceTracked, Trigger, TriggerChain } from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
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

        it("should transform valid triggers chains", () => {
            const node: SourceTracked<TriggerChain> = {
                type: "TriggerChain",
                location: makeDummyLocation(),
                condition: {
                    name: withDummyLocation("Researched"),
                    argument: withDummyLocation("tech-oil_well")
                },
                actions: [
                    {
                        name: withDummyLocation("Build"),
                        argument: withDummyLocation("city-oil_well")
                    },
                    {
                        name: withDummyLocation("Build"),
                        argument: withDummyLocation("city-cement_plant")
                    }
                ]
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(2);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].actionType).toBe("build");
                expect(statements[0].actionId).toBe("city-oil_well");
                expect(statements[0].actionCount).toBe(1);
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(1);
            }

            expect(statements[1].type).toBe("Trigger");
            if (statements[1].type === "Trigger") {
                expect(statements[1].actionType).toBe("build");
                expect(statements[1].actionId).toBe("city-cement_plant");
                expect(statements[1].actionCount).toBe(1);
                expect(statements[1].conditionType).toBe("chain");
                expect(statements[1].conditionId).toBe("");
                expect(statements[1].conditionCount).toBe(1);
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
