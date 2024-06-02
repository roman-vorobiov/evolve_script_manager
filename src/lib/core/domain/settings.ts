import defaultSettings from "$lib/assets/default.json";
import { craftableResources as craftables } from "./resources";

export const settings = Object.keys(defaultSettings).filter(id => {
    return id !== "scriptName"
        && id !== "overrides"
        && id !== "triggers"
        && id !== "evolutionQueue";
});

export function settingType(id: string): string | undefined {
    if (id === "researchIgnore" || id === "logFilter") {
        return "string[]";
    }

    const defaultValue = defaultSettings[id as keyof typeof defaultSettings];
    if (defaultValue !== undefined) {
        return typeof defaultValue;
    }
}

type PrefixDefinition = {
    prefix: string,
    type: "string" | "number" | "boolean",
    valueDescription: string,
    allowedSuffixes: string[]
}

function fillAllowedSuffixes(definitions: Record<string, Record<string, string>>) {
    const result: Record<string, PrefixDefinition> = {};

    for (const [category, prefixes] of Object.entries(definitions)) {
        for (const [name, prefix] of Object.entries(prefixes)) {
            result[name] = { prefix, type: null as any, valueDescription: category, allowedSuffixes: [] }
        }
    }

    // Try "job_p" before "job_"
    const entries = Object.values(result).sort((l, r) => r.prefix.length - l.prefix.length);

    for (const setting of settings) {
        // Don't match this one with the 'Log' prefix
        if (setting === "log_prestige_format") {
            continue;
        }

        for (let entry of entries) {
            if (setting.startsWith(entry.prefix)) {
                const suffix = setting.slice(entry.prefix.length);

                // Both of these have the same prefix: AutoCraftsman for craftables, AutoJob for the rest
                if (entry.prefix === "job_") {
                    entry = (craftables as any)[suffix] !== undefined ? result.AutoCraftsman : result.AutoJob;
                }

                entry.type = settingType(setting) as PrefixDefinition["type"];

                entry.allowedSuffixes.push(suffix);

                break;
            }
        }
    }

    return result;
}

export const prefixes = fillAllowedSuffixes({
    "challenge": {
        Challenge:              "challenge_"
    },
    "log category": {
        Log:                    "log_"
    },
    "building": {
        AutoBuild:              "bat",
        AutoBuildPriority:      "bld_p_",
        AutoBuildWeight:        "bld_w_",
        BuildingMax:            "bld_m_",
        AutoPower:              "bld_s_",
        AutoPowerSmart:         "bld_s2_",
    },
    "project": {
        AutoArpa:               "arpa_",
        AutoArpaPriority:       "arpa_p_",
        AutoArpaWeight:         "arpa_w_",
        ProjectMax:             "arpa_m_",
    },
    "resource": {
        AutoBuy:                "buy",
        AutoBuyRatio:           "res_buy_r_",
        AutoBuyPriority:        "res_buy_p_",
        AutoSell:               "sell",
        AutoSellRatio:          "res_sell_r_",
        AutoTradeBuy:           "res_trade_buy_",
        AutoTradeSell:          "res_trade_sell_",
        AutoTradeWeight:        "res_trade_w_",
        AutoTradePriority:      "res_trade_p_",

        GalaxyTradePriority:    "res_galaxy_p_",
        GalaxyTradeWeight:      "res_galaxy_w_",

        AutoAlchemy:            "res_alchemy_",
        AutoAlchemyWeight:      "res_alchemy_w_",

        AutoCraft:              "craft",
        AutoCraftsman:          "job_",
        AutoFoundryPriority:    "foundry_w_",
        AutoFoundryWeight:      "foundry_p_",

        AutoFactory:            "production_",
        AutoFactoryPriority:    "production_p_",
        AutoFactoryWeight:      "production_w_",

        AutoDroidPriority:      "droid_pr_",
        AutoDroidWeight:        "droid_w_",

        AutoReplicator:         "replicator_",
        AutoReplicatorPriority: "replicator_p_",
        AutoReplicatorWeight:   "replicator_w_",

        AutoStorage:            "res_storage",
        StoragePriority:        "res_storage_p_",
        StorageOverflow:        "res_storage_o_",
        StorageMin:             "res_min_store",
        StorageMax:             "res_max_store",

        AutoEject:              "res_eject",
        AutoSupply:             "res_supply",
        AutoNanite:             "res_nanite",
    },
    "ritual": {
        AutoRitualWeight:       "spell_w_",
    },
    "fuel type": {
        SmelterFuelPriority:    "smelter_fuel_p_",
    },
    "job": {
        AutoJob:                "job_",
        AutoJobPriority:        "job_p",
        AutoJobSmart:           "job_s",
        AutoJobPass1:           "job_b1_",
        AutoJobPass2:           "job_b2_",
        AutoJobPass3:           "job_b3_",
    },
    "planet biome": {
        PlanetBiomeWeight:      "biome_w_",
    },
    "planet trait": {
        PlanetTraitWeight:      "trait_w_",
    },
    "planet bonus": {
        PlanetBonusWeight:      "extra_w_",
    },
    "trait": {
        AutoTrait:              "mTrait_",
        AutoTraitPriority:      "mTrait_p_",
        AutoTraitWeight:        "mTrait_w_",

        AutoMutatepPriority:    "mutableTrait_p_",
        AutoMutateAdd:          "mutableTrait_gain_",
        AutoMutateRemove:       "mutableTrait_purge_",
        AutoMutateReset:        "mutableTrait_reset_",
    },
    "system": {
        FleetPriority:          "fleet_pr_",

        FleetOuterWeight:       "fleet_outer_pr_",
        FleetouterDefend:       "fleet_outer_def_",
        FleetouterScouts:       "fleet_outer_sc_",
    },
    "blueprint": {
        FleetOuterFighter:      "fleet_outer_",
        FleetOuterScout:        "fleet_scout_",
    }
});
