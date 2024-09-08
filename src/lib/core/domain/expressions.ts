import { challenges } from "./challenges";
import { races as normalRaces, pseudoRaces } from "./races";
import { playableGenera, mimicGenera } from "./genera";
import { traits } from "./traits";
import { settings as settingIDs } from "./settings";
import buildings from "./buildings";
import researchNames from "./tech";
import projects from "./projects";
import { resources } from "./resources";
import { jobs as normalJobs, servantJobs, crafters } from "./jobs";
import * as enums from "./enums";

function listToMap(values: string[]): Record<string, string> {
    return Object.fromEntries(values.map(v => [v, v]))
}

const settings = listToMap(settingIDs);
const researches = Object.fromEntries(Object.entries(researchNames).map(([key, values]) => [key, values[0]]));
const jobs = { ...normalJobs, ...crafters };
const races = { ...listToMap(Object.values(normalRaces)), ...listToMap(Object.keys(pseudoRaces)) };
const queueTypes = listToMap(Object.keys(enums.queueTypes));

const industryTypes = {
    smelters: "Smelter Slots",
    factories: "Factory Slots"
}

function speciesAlias(value: string): string {
    return pseudoRaces[value as keyof typeof pseudoRaces] ?? value;
}

function queueAlias(value: string): string {
    return enums.queueTypes[value as keyof typeof enums.queueTypes] ?? value;
}

function arpaAlias(value: string): string {
    return `arpa${value}`;
}

export type ExpressionType = {
    type: "string" | "number" | "boolean" | null,
    valueDescription: string,
    allowedValues: Record<string, string>,
    alias?: (value: string) => string
}

export const expressions: Record<string, ExpressionType> = {
    SettingDefault:       { type: null,      valueDescription: "setting", allowedValues: settings },
    SettingCurrent:       { type: null,      valueDescription: "setting", allowedValues: settings },

    BuildingUnlocked:     { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingClickable:    { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingAffordable:   { type: "boolean", valueDescription: "building", allowedValues: buildings },
    BuildingCount:        { type: "number",  valueDescription: "building", allowedValues: buildings },
    BuildingEnabled:      { type: "number",  valueDescription: "building", allowedValues: buildings },
    BuildingDisabled:     { type: "number",  valueDescription: "building", allowedValues: buildings },
    BuildingQueued:       { type: "boolean", valueDescription: "building", allowedValues: buildings },

    ProjectUnlocked:      { type: "boolean", valueDescription: "project", allowedValues: projects, alias: arpaAlias },
    ProjectCount:         { type: "number",  valueDescription: "project", allowedValues: projects, alias: arpaAlias },
    ProjectProgress:      { type: "number",  valueDescription: "project", allowedValues: projects, alias: arpaAlias },

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
    ResourceMaxCost:      { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceIncome:       { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceRatio:        { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceSatisfied:    { type: "boolean", valueDescription: "resource", allowedValues: resources },
    ResourceSatisfyRatio: { type: "number",  valueDescription: "resource", allowedValues: resources },
    ResourceDemanded:     { type: "boolean", valueDescription: "resource", allowedValues: resources },

    Industry:             { type: "number", valueDescription: "industry", allowedValues: industryTypes },

    RaceId:               { type: "string",  valueDescription: "race", allowedValues: races, alias: speciesAlias },
    RacePillared:         { type: "boolean", valueDescription: "race", allowedValues: races, alias: speciesAlias },

    RaceGenus:            { type: "boolean", valueDescription: "genus", allowedValues: playableGenera },
    MimicGenus:           { type: "boolean", valueDescription: "genus", allowedValues: mimicGenera },

    TraitLevel:           { type: "number",  valueDescription: "trait", allowedValues: traits },

    ResetType:            { type: "boolean", valueDescription: "reset type", allowedValues: enums.resetTypes },

    Challenge:            { type: "boolean", valueDescription: "challenge", allowedValues: challenges },

    Universe:             { type: "boolean", valueDescription: "universe", allowedValues: { bigbang: "Big Bang", ...enums.universes } },

    PlanetBiome:          { type: "boolean", valueDescription: "biome", allowedValues: enums.planetaryBiomes },

    PlanetTrait:          { type: "boolean", valueDescription: "trait", allowedValues: enums.planetaryTraits },

    Government:           { type: "boolean", valueDescription: "government", allowedValues: enums.governments },

    Governor:             { type: "boolean", valueDescription: "governor", allowedValues: { none: "None", ...enums.governors } },

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

export const otherExpressionsAliases = Object.fromEntries(Object.entries(otherExpressions).map(([name, { aliasFor }]) => [aliasFor, name]));
