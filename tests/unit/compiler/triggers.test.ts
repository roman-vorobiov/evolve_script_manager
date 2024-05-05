import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation } from "$lib/core/dsl/parser/utils";
import { makeDummyLocation, withDummyLocation } from "./fixture";

import type { SourceTracked } from "$lib/core/dsl/parser/source";
import type { Trigger, TriggerChain } from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
    describe("Triggers", () => {
        it("should transform valid triggers", () => {
            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well"), withDummyLocation(123)]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well"), withDummyLocation(456)]
                })
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(456);
                expect(statements[0].actionType).toBe("build");
                expect(statements[0].actionId).toBe("city-oil_well");
                expect(statements[0].actionCount).toBe(123);
            }
        });

        it("should transform valid triggers without count", () => {
            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(1);
                expect(statements[0].actionType).toBe("build");
                expect(statements[0].actionId).toBe("city-oil_well");
                expect(statements[0].actionCount).toBe(1);
            }
        });

        it("should transform valid triggers chains", () => {
            const node: SourceTracked<TriggerChain> = {
                type: "TriggerChain",
                location: makeDummyLocation(),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well"), withDummyLocation(123)]
                }),
                actions: [
                    withDummyLocation({
                        name: withDummyLocation("Build"),
                        arguments: [withDummyLocation("city-oil_well"), withDummyLocation(456)]
                    }),
                    withDummyLocation({
                        name: withDummyLocation("Build"),
                        arguments: [withDummyLocation("city-cement_plant"), withDummyLocation(789)]
                    })
                ]
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(2);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(123);
                expect(statements[0].actionType).toBe("build");
                expect(statements[0].actionId).toBe("city-oil_well");
                expect(statements[0].actionCount).toBe(456);
            }

            expect(statements[1].type).toBe("Trigger");
            if (statements[1].type === "Trigger") {
                expect(statements[1].conditionType).toBe("chain");
                expect(statements[1].conditionId).toBe("");
                expect(statements[1].conditionCount).toBe(0);
                expect(statements[1].actionType).toBe("build");
                expect(statements[1].actionId).toBe("city-cement_plant");
                expect(statements[1].actionCount).toBe(789);
            }
        });

        it("should normalize arpa ids", () => {
            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Arpa"),
                    arguments: [withDummyLocation("lhc")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
            };

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].conditionType).toBe("researched");
                expect(statements[0].conditionId).toBe("tech-oil_well");
                expect(statements[0].conditionCount).toBe(1);
                expect(statements[0].actionType).toBe("arpa");
                expect(statements[0].actionId).toBe("arpalhc");
                expect(statements[0].actionCount).toBe(1);
            }
        });

        it("should refuse mismatched condition/action types", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withLocation(location, "Research"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
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
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withLocation(location, "Hello"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
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
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withLocation(location, "hello")]
                })
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown tech 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid condition count", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well"), withLocation(location, 1.23)]
                })
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Value must be an integer");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse mismatched condition type/id", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withLocation(location, "city-oil_well")]
                })
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
                action: withDummyLocation({
                    name: withLocation(location, "Hello"),
                    arguments: [withDummyLocation("city-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
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
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withLocation(location, "hello")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown building 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse invalid action count", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withDummyLocation("city-oil_well"), withLocation(location, 1.23)]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Value must be an integer");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should refuse mismatched action type/id", () => {
            const location = makeDummyLocation(123);

            const node: SourceTracked<Trigger> = {
                type: "Trigger",
                location: makeDummyLocation(),
                action: withDummyLocation({
                    name: withDummyLocation("Build"),
                    arguments: [withLocation(location, "tech-oil_well")]
                }),
                condition: withDummyLocation({
                    name: withDummyLocation("Researched"),
                    arguments: [withDummyLocation("tech-oil_well")]
                })
            };

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown building 'tech-oil_well'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });
});
