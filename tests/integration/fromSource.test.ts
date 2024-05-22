import exampleConfig from "$lib/assets/example.txt?raw";

import { describe, it, expect } from "vitest";
import { fromSource } from "$lib/core/dsl";

describe("Compilation", () => {
    it("should handle wildcards", () => {
        const { config, errors } = fromSource(`
            SmelterFuelPriority[*] = 1
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {},
            triggers: [],
            smelter_fuel_p_Coal: 1,
            smelter_fuel_p_Inferno: 1,
            smelter_fuel_p_Oil: 1,
            smelter_fuel_p_Wood: 1
        });
    });

    it("should handle lists", () => {
        const { config, errors } = fromSource(`
            SmelterFuelPriority[Coal, Inferno] = 1
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {},
            triggers: [],
            smelter_fuel_p_Coal: 1,
            smelter_fuel_p_Inferno: 1
        });
    });

    it("should handle placeholders", () => {
        const { config, errors } = fromSource(`
            SmelterFuelPriority[Coal, Oil] = 0 if ResourceDemanded[...]
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {
                smelter_fuel_p_Coal: [
                    {
                        type1: "ResourceDemanded",
                        arg1: "Coal",
                        cmp: "==",
                        type2: "Boolean",
                        arg2: true,
                        ret: 0
                    }
                ],
                smelter_fuel_p_Oil: [
                    {
                        type1: "ResourceDemanded",
                        arg1: "Oil",
                        cmp: "==",
                        type2: "Boolean",
                        arg2: true,
                        ret: 0
                    }
                ]
            },
            triggers: []
        });
    });

    it("should handle aliases", () => {
        const { config, errors } = fromSource(`
            sellCoal = ON if BrokenCars > 1
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {
                sellCoal: [
                    {
                        type1: "Other",
                        arg1: "bcar",
                        cmp: ">",
                        type2: "Number",
                        arg2: 1,
                        ret: true
                    }
                ]
            },
            triggers: []
        });
    });

    it("should handle expressions as values", () => {
        const { config, errors } = fromSource(`
            sellCoal = not ResourceDemanded.Coal
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {
                sellCoal: [
                    {
                        type1: "Boolean",
                        arg1: true,
                        cmp: "A?B",
                        type2: "Eval",
                        arg2: "!_('ResourceDemanded', 'Coal')",
                        ret: null
                    }
                ]
            },
            triggers: []
        });
    });

    it("should handle condition blocks", () => {
        const { config, errors } = fromSource(`
            if BrokenCars > 1 then
                sellCoal = ON
            end
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {
                sellCoal: [
                    {
                        type1: "Other",
                        arg1: "bcar",
                        cmp: ">",
                        type2: "Number",
                        arg2: 1,
                        ret: true
                    }
                ]
            },
            triggers: []
        });
    });

    it("should handle aliases", () => {
        const { config, errors } = fromSource(`
            sellCoal = ON if ResourceDemanded.Coal and not (ResourceQuantity.Coal > 10)
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {
                sellCoal: [
                    {
                        type1: "ResourceDemanded",
                        arg1: "Coal",
                        cmp: "AND",
                        type2: "Eval",
                        arg2: "!(_('ResourceQuantity', 'Coal') > 10)",
                        ret: true
                    }
                ]
            },
            triggers: []
        });
    });

    it("should handle triggers", () => {
        const { config, errors } = fromSource(`
            Research tech-club when Built city-windmill
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {},
            triggers: [
                {
                    seq: 0,
                    priority: 0,
                    requirementType: "built",
                    requirementId: "city-windmill",
                    requirementCount: 1,
                    actionType: "research",
                    actionId: "tech-club",
                    actionCount: 1,
                    complete: false,
                },
            ]
        });
    });

    it("should handle trigger chains", () => {
        const { config, errors } = fromSource(`
            when Built city-windmill do
                Research tech-club
                Build city-bank
            end
        `);

        expect(errors).toStrictEqual([]);
        expect(config).toEqual({
            overrides: {},
            triggers: [
                {
                    seq: 0,
                    priority: 0,
                    requirementType: "built",
                    requirementId: "city-windmill",
                    requirementCount: 1,
                    actionType: "research",
                    actionId: "tech-club",
                    actionCount: 1,
                    complete: false,
                },
                {
                    seq: 1,
                    priority: 1,
                    requirementType: "chain",
                    requirementId: "",
                    requirementCount: 0,
                    actionType: "build",
                    actionId: "city-bank",
                    actionCount: 1,
                    complete: false,
                },
            ]
        });
    });

    it("should handle large configs", () => {
        const { errors } = fromSource(exampleConfig);

        expect(errors).toStrictEqual([]);
    });
});
