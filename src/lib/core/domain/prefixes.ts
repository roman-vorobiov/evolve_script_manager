import { challenges as rawChallenges } from "./challenges";
import {
    minorTraits as minorTraitNames,
    majorTraits as majorTraitNames
} from "./traits";
import buildingNames from "./buildings";
import projectNames from "./projects";
import {
    jobs as jobNames,
    smartJobs as smartJobNames,
    crafters as crafterNames
} from "./jobs";
import {
    tradableResources as tradableResourceNames,
    galaxyTradableResources as galaxyTradableResourceNames,
    alchemyResources as alchemyResourceNames,
    manufacturableResources,
    minableResources,
    ejectableResources as ejectableResourceNames,
    supplyResources,
    naniteResources,
    storableResources
} from "./resources";
import * as enums from "./enums";

const challenges = rawChallenges.map(challenge => challenge.startsWith("no_") ? challenge.slice(3) : challenge);
const buildings = Object.keys(buildingNames);
const projects = Object.keys(projectNames);
const jobs = Object.keys(jobNames);
const smartJobs = Object.keys(smartJobNames);
const crafters = Object.keys(crafterNames);
const tradableResources = Object.keys(tradableResourceNames);
const galaxyTradableResources = Object.keys(galaxyTradableResourceNames);
const alchemyResources = Object.keys(alchemyResourceNames);
const ejectableResources = Object.keys(ejectableResourceNames);
const minorTraits = Object.keys(minorTraitNames);
const majorTraits = Object.keys(majorTraitNames);

type PrefixDefinition = {
    prefix: string,
    valueDescription: string,
    allowedValues: string[]
}

export default <Record<string, PrefixDefinition>> {
    Challenge:              { prefix: "challenge_",          valueDescription: "challenge", allowedValues: challenges },

    Log:                    { prefix: "log_",                valueDescription: "log category", allowedValues: enums.logCategories },

    AutoBuild:              { prefix: "bat",                 valueDescription: "building", allowedValues: buildings },
    AutoBuildPriority:      { prefix: "bld_p_",              valueDescription: "building", allowedValues: buildings },
    AutoBuildWeight:        { prefix: "bld_w_",              valueDescription: "building", allowedValues: buildings },
    BuildingMax:            { prefix: "bld_m_",              valueDescription: "building", allowedValues: buildings },
    AutoPower:              { prefix: "bld_s_",              valueDescription: "building", allowedValues: buildings },
    AutoPowerSmart:         { prefix: "bld_s2_",             valueDescription: "building", allowedValues: buildings },

    AutoArpa:               { prefix: "arpa_",               valueDescription: "project", allowedValues: projects },
    AutoArpaPriority:       { prefix: "arpa_p_",             valueDescription: "project", allowedValues: projects },
    AutoArpaWeight:         { prefix: "arpa_w_",             valueDescription: "project", allowedValues: projects },
    ProjectMax:             { prefix: "arpa_m_",             valueDescription: "project", allowedValues: projects },

    AutoBuy:                { prefix: "buy",                 valueDescription: "resource", allowedValues: tradableResources },
    AutoBuyRatio:           { prefix: "res_buy_r_",          valueDescription: "resource", allowedValues: tradableResources },
    AutoBuyPriority:        { prefix: "res_buy_p_",          valueDescription: "resource", allowedValues: tradableResources },
    AutoSell:               { prefix: "sell",                valueDescription: "resource", allowedValues: tradableResources },
    AutoSellRatio:          { prefix: "res_sell_r_",         valueDescription: "resource", allowedValues: tradableResources },
    AutoTradeBuy:           { prefix: "res_trade_buy_",      valueDescription: "resource", allowedValues: tradableResources },
    AutoTradeSell:          { prefix: "res_trade_sell_",     valueDescription: "resource", allowedValues: tradableResources },
    AutoTradeWeight:        { prefix: "res_trade_w_",        valueDescription: "resource", allowedValues: tradableResources },
    AutoTradePriority:      { prefix: "res_trade_p_",        valueDescription: "resource", allowedValues: tradableResources },

    GalaxyTradePriority:    { prefix: "res_galaxy_p_",       valueDescription: "resource", allowedValues: galaxyTradableResources },
    GalaxyTradeWeight:      { prefix: "res_galaxy_w_",       valueDescription: "resource", allowedValues: galaxyTradableResources },

    AutoAlchemy:            { prefix: "res_alchemy_",        valueDescription: "resource", allowedValues: alchemyResources },
    AutoAlchemyWeight:      { prefix: "res_alchemy_w_",      valueDescription: "resource", allowedValues: alchemyResources },

    AutoRitualWeight:       { prefix: "spell_w_",            valueDescription: "ritual", allowedValues: enums.rituals },

    AutoCraft:              { prefix: "craft",               valueDescription: "resource", allowedValues: crafters },
    AutoCraftsman:          { prefix: "job_",                valueDescription: "resource", allowedValues: crafters },
    AutoFoundryPriority:    { prefix: "foundry_w_",          valueDescription: "resource", allowedValues: crafters },
    AutoFoundryWeight:      { prefix: "foundry_p_",          valueDescription: "resource", allowedValues: crafters },

    AutoFactory:            { prefix: "production_",         valueDescription: "resource", allowedValues: manufacturableResources },
    AutoFactoryPriority:    { prefix: "production_p_",       valueDescription: "resource", allowedValues: manufacturableResources },
    AutoFactoryWeight:      { prefix: "production_w_",       valueDescription: "resource", allowedValues: manufacturableResources },

    AutoDroidPriority:      { prefix: "droid_pr_",           valueDescription: "resource", allowedValues: minableResources },
    AutoDroidWeight:        { prefix: "droid_w_",            valueDescription: "resource", allowedValues: minableResources },

    AutoReplicator:         { prefix: "replicator_",         valueDescription: "resource", allowedValues: ejectableResources },
    AutoReplicatorPriority: { prefix: "replicator_p_",       valueDescription: "resource", allowedValues: ejectableResources },
    AutoReplicatorWeight:   { prefix: "replicator_w_",       valueDescription: "resource", allowedValues: ejectableResources },

    AutoStorage:            { prefix: "res_storage",         valueDescription: "resource", allowedValues: storableResources },
    StoragePriority:        { prefix: "res_storage_p_",      valueDescription: "resource", allowedValues: storableResources },
    StorageOverflow:        { prefix: "res_storage_o_",      valueDescription: "resource", allowedValues: storableResources },
    StorageMin:             { prefix: "res_min_store",       valueDescription: "resource", allowedValues: storableResources },
    StorageMax:             { prefix: "res_max_store",       valueDescription: "resource", allowedValues: storableResources },

    AutoEject:              { prefix: "res_eject",           valueDescription: "resource", allowedValues: ejectableResources },
    AutoSupply:             { prefix: "res_supply",          valueDescription: "resource", allowedValues: supplyResources },
    AutoNanite:             { prefix: "res_nanite",          valueDescription: "resource", allowedValues: naniteResources },

    SmelterFuelPriority:    { prefix: "smelter_fuel_p_",     valueDescription: "fuel type", allowedValues: enums.fuelTypes },

    AutoJob:                { prefix: "job_",                valueDescription: "job", allowedValues: jobs },
    AutoJobPriority:        { prefix: "job_p",               valueDescription: "job", allowedValues: jobs },
    AutoJobSmart:           { prefix: "job_s",               valueDescription: "job", allowedValues: smartJobs },
    AutoJobPass1:           { prefix: "job_b1_",             valueDescription: "job", allowedValues: jobs },
    AutoJobPass2:           { prefix: "job_b2_",             valueDescription: "job", allowedValues: jobs },
    AutoJobPass3:           { prefix: "job_b3_",             valueDescription: "job", allowedValues: jobs },

    PlanetBiomeWeight:      { prefix: "biome_w_",            valueDescription: "planet biome", allowedValues: enums.planetaryBiomes },
    PlanetTraitWeight:      { prefix: "trait_w_",            valueDescription: "planet trait", allowedValues: enums.planetaryTraits },
    PlanetBonusWeight:      { prefix: "extra_w_",            valueDescription: "planet bonus", allowedValues: enums.planetaryBonuses },

    AutoTrait:              { prefix: "mTrait_",             valueDescription: "trait", allowedValues: minorTraits },
    AutoTraitPriority:      { prefix: "mTrait_p_",           valueDescription: "trait", allowedValues: minorTraits },
    AutoTraitWeight:        { prefix: "mTrait_w_",           valueDescription: "trait", allowedValues: minorTraits },

    AutoMutatepPriority:    { prefix: "mutableTrait_p_",     valueDescription: "trait", allowedValues: majorTraits },
    AutoMutateAdd:          { prefix: "mutableTrait_gain_",  valueDescription: "trait", allowedValues: majorTraits },
    AutoMutateRemove:       { prefix: "mutableTrait_purge_", valueDescription: "trait", allowedValues: majorTraits },
    AutoMutateReset:        { prefix: "mutableTrait_reset_", valueDescription: "trait", allowedValues: majorTraits },

    FleetPriority:          { prefix: "fleet_pr_",           valueDescription: "system", allowedValues: enums.andromedaSystems },

    // FleetOuterWeight:       { prefix: "fleet_outer_pr_",     valueDescription: "system", allowedValues: [] },
    // FleetouterDefend:       { prefix: "fleet_outer_def_",    valueDescription: "system", allowedValues: [] },
    // FleetouterScouts:       { prefix: "fleet_outer_sc_",     valueDescription: "system", allowedValues: [] },

    // FleetOuterFighter:      { prefix: "fleet_outer_",        valueDescription: "blueprint", allowedValues: [] },
    // FleetOuterScout:        { prefix: "fleet_scout_",        valueDescription: "blueprint", allowedValues: [] },
};
