import { challenges } from "./challenges";
import { minorTraits as traitNames } from "./traits";
import buildingNames from "./buildings";
import researchNames from "./tech";
import projectNames from "./projects";
import { basicResources as resourceNames } from "./resources";
import * as enums from "./enums";

// Todo: only a subset of these applies
const buildings = Object.keys(buildingNames);
const projects = Object.keys(projectNames);
const researches = Object.keys(researchNames);
const resources = Object.keys(resourceNames);
const traits = Object.keys(traitNames);

type PrefixDefinition = {
    prefix: string,
    valueDescription: string,
    allowedValues: string[]
}

export default <Record<string, PrefixDefinition>> {
    Challenge:     { prefix: "challenge_",   valueDescription: "challenge", allowedValues: challenges },

    Log:           { prefix: "log_",         valueDescription: "log category", allowedValues: enums.logCategories },

    AutoSell:      { prefix: "sell",         valueDescription: "resource", allowedValues: resources },
    TradePriority: { prefix: "res_trade_p_", valueDescription: "resource", allowedValues: resources },

    AutoTrait:     { prefix: "mTrait_",      valueDescription: "trait", allowedValues: traits },

    FleetPriority: { prefix: "fleet_pr_",    valueDescription: "system", allowedValues: enums.andromedaSystems }
};
