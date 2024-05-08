import { describe, it, expect } from "vitest";
import { compile } from "$lib/core/dsl/compiler/compile";
import { withLocation } from "$lib/core/dsl/parser/utils";
import { makeDummyLocation, withDummyLocation, makeTriggerArgument } from "./fixture";

import type { Trigger } from "$lib/core/dsl/parser/model";

describe("Compiler", () => {
    describe("Triggers", () => {
        it("should transform valid triggers", () => {
            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well", 456),
                actions: [makeTriggerArgument("Build", "city-oil_well", 123)]
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].condition.type).toBe("researched");
                expect(statements[0].condition.id).toBe("tech-oil_well");
                expect(statements[0].condition.count).toBe(456);
                expect(statements[0].action.type).toBe("build");
                expect(statements[0].action.id).toBe("city-oil_well");
                expect(statements[0].action.count).toBe(123);
            }
        });

        it("should transform valid triggers without count", () => {
            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well"),
                actions: [makeTriggerArgument("Build", "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].condition.type).toBe("researched");
                expect(statements[0].condition.id).toBe("tech-oil_well");
                expect(statements[0].condition.count).toBe(1);
                expect(statements[0].action.type).toBe("build");
                expect(statements[0].action.id).toBe("city-oil_well");
                expect(statements[0].action.count).toBe(1);
            }
        });

        it("should transform valid triggers chains", () => {
            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well", 123),
                actions: [
                    makeTriggerArgument("Build", "city-oil_well", 456),
                    makeTriggerArgument("Build", "city-cement_plant", 789)
                ]
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(2);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].condition.type).toBe("researched");
                expect(statements[0].condition.id).toBe("tech-oil_well");
                expect(statements[0].condition.count).toBe(123);
                expect(statements[0].action.type).toBe("build");
                expect(statements[0].action.id).toBe("city-oil_well");
                expect(statements[0].action.count).toBe(456);
            }

            expect(statements[1].type).toBe("Trigger");
            if (statements[1].type === "Trigger") {
                expect(statements[1].condition.type).toBe("chain");
                expect(statements[1].condition.id).toBe("");
                expect(statements[1].condition.count).toBe(0);
                expect(statements[1].action.type).toBe("build");
                expect(statements[1].action.id).toBe("city-cement_plant");
                expect(statements[1].action.count).toBe(789);
            }
        });

        it("should normalize arpa ids", () => {
            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well"),
                actions: [makeTriggerArgument("Arpa", "lhc")]
            });

            const { statements, errors } = compile([node]);

            expect(errors).toStrictEqual([]);
            expect(statements.length).toBe(1);

            expect(statements[0].type).toBe("Trigger");
            if (statements[0].type === "Trigger") {
                expect(statements[0].condition.type).toBe("researched");
                expect(statements[0].condition.id).toBe("tech-oil_well");
                expect(statements[0].condition.count).toBe(1);
                expect(statements[0].action.type).toBe("arpa");
                expect(statements[0].action.id).toBe("arpalhc");
                expect(statements[0].action.count).toBe(1);
            }
        });

        it("should reject mismatched condition/action types", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument(withLocation(location, "Research"), "tech-oil_well"),
                actions: [makeTriggerArgument("Build", "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown trigger condition 'Research'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid condition types", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument(withLocation(location, "Hello"), "tech-oil_well"),
                actions: [makeTriggerArgument("Build", "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown trigger condition 'Hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid condition ids", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", withLocation(location, "hello")),
                actions: [makeTriggerArgument("Build", "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown tech 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid condition count", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well", withLocation(location, 1.23)),
                actions: [makeTriggerArgument("Build", "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Value must be an integer");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject mismatched condition type/id", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", withLocation(location, "city-oil_well")),
                actions: [makeTriggerArgument("Build", "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown tech 'city-oil_well'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid action types", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well"),
                actions: [makeTriggerArgument(withLocation(location, "Hello"), "city-oil_well")]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown trigger action 'Hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid action ids", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well"),
                actions: [makeTriggerArgument("Build", withLocation(location, "hello"))]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown building 'hello'");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject invalid action count", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well"),
                actions: [makeTriggerArgument("Build", "city-oil_well", withLocation(location, 1.23))]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Value must be an integer");
            expect(errors[0].location).toStrictEqual(location);
        });

        it("should reject mismatched action type/id", () => {
            const location = makeDummyLocation(123);

            const node = withDummyLocation(<Trigger> {
                type: "Trigger",
                condition: makeTriggerArgument("Researched", "tech-oil_well"),
                actions: [makeTriggerArgument("Build", withLocation(location, "tech-oil_well"))]
            });

            const { statements, errors } = compile([node]);

            expect(statements).toStrictEqual([]);
            expect(errors.length).toBe(1);

            expect(errors[0].message).toBe("Unknown building 'tech-oil_well'");
            expect(errors[0].location).toStrictEqual(location);
        });
    });
});
