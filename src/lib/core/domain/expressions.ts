import { challenges } from "./challenges";
import { races as raceNames, pseudoRaces } from "./races";
import { playableGenera, mimicGenera } from "./genera";
import traitNames from "./traits";
import { settings } from "./settings";
import buildingNames from "./buildings";
import researchNames from "./tech";
import projectNames from "./projects";
import { resources as resourceNames } from "./resources";
import { jobs as jobNames, servantJobs as servantJobNames, crafters as crafterJobsNames } from "./jobs";
import * as enums from "./enums";

const buildings = Object.keys(buildingNames);
const projects = Object.keys(projectNames);
const researches = Object.keys(researchNames);
const resources = Object.keys(resourceNames);
const jobs = [...Object.keys(jobNames), ...Object.keys(crafterJobsNames)];
const servantJobs = Object.keys(servantJobNames);
const resetTypes = Object.keys(enums.resetTypes);
const races = [...Object.keys(raceNames), ...Object.keys(pseudoRaces)];
const traits = Object.keys(traitNames);
const queueTypes = Object.keys(enums.queueTypes);

function speciesAlias(value: string): string {
    return pseudoRaces[value as keyof typeof pseudoRaces] ?? value;
}

function queueAlias(value: string): string {
    return enums.queueTypes[value as keyof typeof enums.queueTypes] ?? value;
}

type ExpressionType = {
    type: "string" | "number" | "boolean" | null,
    valueDescription: string,
    allowedValues: string[] | null,
    alias?: (value: string) => string
}

export const expressions: Record<string, ExpressionType> = {
    SettingDefault:       { type: null,      valueDescription: "setting", allowedValues: settings },
    SettingCurrent:       { type: null,      valueDescription: "setting", allowedValues: settings },

    Eval:                 { type: null,      valueDescription: "eval", allowedValues: null },

    BuildingUnlocked:     { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingClickable:    { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingAffordable:   { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingCount:        { type: "number",  valueDescription: "building", allowedValues: buildings },
    BuildingEnabled:      { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingDisabled:     { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingQueued:       { type: "boolean", valueDescription: "building", allowedValues: buildings },

    ProjectUnlocked:      { type: "boolean", valueDescription: "project", allowedValues: projects },
    ProjectCount:         { type: "number",  valueDescription: "project", allowedValues: projects },
    ProjectProgress:      { type: "number",  valueDescription: "project", allowedValues: projects },

    JobUnlocked:          { type: "boolean", valueDescription: "job", allowedValues: jobs },
    JobCount:             { type: "number",  valueDescription: "job", allowedValues: jobs },
    JobMax:               { type: "number",  valueDescription: "job", allowedValues: jobs },
    JobWorkers:           { type: "number",  valueDescription: "job", allowedValues: jobs },
    JobServants:          { type: "number",  valueDescription: "job", allowedValues: servantJobs },

    ResearchUnlocked:     { type: "boolean", valueDescription: "tech", allowedValues: researches },
    ResearchComplete:     { type: "boolean", valueDescription: "tech", allowedValues: researches },

    ResourceUnlocked:     { type: "boolean", valueDescription: "resource", allowedValues: resources },
    ResourceQuantity:     { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceStorage:      { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceIncome:       { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceRatio:        { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceSatisfied:    { type: "boolean", valueDescription: "resource", allowedValues: resources },
    ResourceSatisfyRatio: { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceDemanded:     { type: "boolean", valueDescription: "resource", allowedValues: resources },

    RaceId:               { type: "string",  valueDescription: "race", allowedValues: races, alias: speciesAlias },
    RacePillared:         { type: "boolean", valueDescription: "race", allowedValues: races, alias: speciesAlias },

    RaceGenus:            { type: "boolean", valueDescription: "genus", allowedValues: playableGenera },
    MimicGenus:           { type: "boolean", valueDescription: "genus", allowedValues: mimicGenera },

    TraitLevel:           { type: "number",  valueDescription: "trait", allowedValues: traits },

    ResetType:            { type: "boolean", valueDescription: "reset type", allowedValues: resetTypes },

    Challenge:            { type: "boolean", valueDescription: "challenge", allowedValues: challenges },

    Universe:             { type: "boolean", valueDescription: "universe", allowedValues: ["bigbang", ...enums.universes] },

    PlanetBiome:          { type: "boolean", valueDescription: "biome", allowedValues: enums.planetaryBiomes },

    PlanetTrait:          { type: "boolean", valueDescription: "trait", allowedValues: enums.planetaryTraits },

    Government:           { type: "boolean", valueDescription: "government", allowedValues: enums.governments },

    Governor:             { type: "boolean", valueDescription: "governor", allowedValues: ["none", ...enums.governors] },

    Queue:                { type: "number",  valueDescription: "queue", allowedValues: queueTypes, alias: queueAlias },

    Date:                 { type: "number",  valueDescription: "date", allowedValues: enums.dateTypes },

    Soldiers:             { type: "number",  valueDescription: "counter", allowedValues: enums.soldierTypes },
};

type OtherExpressionType = {
    type: "string" | "number" | "boolean",
    aliasFor: string
}

export const otherExpressions: Record<string, OtherExpressionType> = {
    RaceName:         { type: "string", aliasFor: "rname" },
    FleetSize:        { type: "number", aliasFor: "tpfleet" },
    MassRelayCharge:  { type: "number", aliasFor: "mrelay" },
    SatelliteCost:    { type: "number", aliasFor: "satcost" },
    BrokenCars:       { type: "number", aliasFor: "bcar" },
    ActiveChallenges: { type: "number", aliasFor: "alevel" },
    TechKnowledge:    { type: "number", aliasFor: "tknow" },
};
