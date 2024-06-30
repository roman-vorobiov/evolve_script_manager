import techs from "./tech";
import { capitalize } from "../utils/stringUtils";
import { races } from "./races";
import { mimicGenera } from "./genera";
import { ejectableResources } from "./resources";
import {
    universes,
    governments,
    governors,
    resetTypes as resetTypeOptions
} from "./enums";

function fromArray(entries: string[]) {
    return Object.fromEntries(entries.map(entry => [entry, entry]));
}

function fromArrayCapitalized(entries: string[]) {
    return Object.fromEntries(entries.map(entry => [entry, capitalize(entry)]));
}

const foreignPolicyOptions = fromArray([
    "Ignore",
    "Influence",
    "Sabotage",
    "Incite",
    "Annex",
    "Purchase",
    "Occupy"
]);

const mechSizeOptions = {
    auto: "Damage Per Size",
    gems: "Damage Per Gems",
    supply: "Damage Per Supply"
};

// Todo: these have actual labels in strings.json

const tpShipClass = fromArray([
    "corvette",
    "frigate",
    "destroyer",
    "cruiser",
    "battlecruiser",
    "dreadnought",
    "explorer"
]);

const tpShipArmor = fromArray([
    "steel",
    "alloy",
    "neutronium"
]);

const tpShipWeapon = fromArray([
    "railgun",
    "laser",
    "p_laser",
    "plasma",
    "phaser",
    "disruptor"
]);

const tpShipEngine = fromArray([
    "ion",
    "tie",
    "pulse",
    "photon",
    "vacuum",
    "emdrive"
]);

const tpShipPower = fromArray([
    "solar",
    "diesel",
    "fission",
    "fusion",
    "elerium"
]);

const tpShipSensor = fromArray([
    "visual",
    "radar",
    "lidar",
    "quantum"
]);

const governmentOptions = {
    none: "None",
    ...fromArrayCapitalized(governments)
};

const priorityOptions = {
    ignore: "Ignore",
    save: "Save",
    req: "Request",
    savereq: "Request & Save"
};

const spendOptions = {
    cap: "Capped",
    excess: "Excess",
    all: "All",
    mixed: "Capped > Excess",
    full: "Capped > Excess > All"
};

const genusOptions = {
    ignore: "Ignore",
    ...fromArrayCapitalized(mimicGenera)
};

export default <Record<string, Record<string, string>>> {
    userUniverseTargetName: {
        none: "None",
        ...fromArrayCapitalized(universes)
    },

    userPlanetTargetName: {
        none: "None",
        habitable: "Most habitable",
        achieve: "Most achievements",
        weighting: "Highest weighting"
    },

    userEvolutionTarget: {
        auto: "Auto Achievements",
        ...races
    },

    foreignProtect: fromArrayCapitalized([
        "never",
        "always",
        "auto"
    ]),

    foreignPolicyInferior: foreignPolicyOptions,

    foreignPolicySuperior: foreignPolicyOptions,

    foreignPolicyRival: fromArray([
        "Ignore",
        "Influence",
        "Sabotage",
        "Betrayal"
    ]),

    mechScrap: {
        none: "None",
        single: "Full bay",
        all: "All inefficient",
        mixed: "Excess inefficient"
    },

    mechBuild: {
        none: "None",
        random: "Random good",
        user: "Current design"
    },

    mechSize: mechSizeOptions,

    mechSizeGravity: mechSizeOptions,

    mechSpecial: fromArrayCapitalized([
        "always",
        "prefered",
        "random",
        "never"
    ]),

    fleetOuterShips: {
        none: "None",
        user: "Current design",
        manual: "Manual mode",
        custom: "Presets"
    },

    fleetAlien2Loses: {
        none: "No Losses",
        suicide: "Suicide Mission"
    },

    fleetChthonianLoses: {
        ignore: "Manual assault",
        high: "High casualties",
        avg: "Average casualties",
        low: "Low casualties",
        frigate: "Frigate",
        dread: "Dreadnought"
    },

    fleet_outer_class: tpShipClass,

    fleet_outer_armor: tpShipArmor,

    fleet_outer_weapon: tpShipWeapon,

    fleet_outer_engine: tpShipEngine,

    fleet_outer_power: tpShipPower,

    fleet_outer_sensor: tpShipSensor,

    fleet_scout_class: tpShipClass,

    fleet_scout_armor: tpShipArmor,

    fleet_scout_weapon: tpShipWeapon,

    fleet_scout_engine: tpShipEngine,

    fleet_scout_power: tpShipPower,

    fleet_scout_sensor: tpShipSensor,

    govInterim: governmentOptions,

    govFinal: governmentOptions,

    govSpace: governmentOptions,

    govGovernor: {
        none: "None",
        ...fromArrayCapitalized(governors)
    },

    userResearchTheology_1: {
        auto: "ScriptManaged",
        ["tech-anthropology"]: techs["tech-anthropology"][0],
        ["tech-fanaticism"]: techs["tech-fanaticism"][0]
    },

    userResearchTheology_2: {
        auto: "ScriptManaged",
        ["tech-study"]: techs["tech-study"][0],
        ["tech-deify"]: techs["tech-deify"][0]
    },

    productionFoundryWeighting: {
        none: "None",
        demanded: "Prioritize demanded",
        buildings: "Buildings weightings"
    },

    productionCraftsmen: {
        always: "Always",
        nocraft: "No Manual Crafting",
        advanced: "Advanced",
        servants: "Servants"
    },

    productionSmelting: {
        iron: "Prioritize Iron",
        steel: "Prioritize Steel",
        storage: "Up to full storages",
        required: "Up to required amounts"
    },

    prioritizeTriggers: priorityOptions,

    prioritizeQueue: priorityOptions,

    prioritizeUnify: priorityOptions,

    prioritizeOuterFleet: priorityOptions,

    prestigeType: resetTypeOptions,

    // Todo
    prestigeVaxStrat: fromArray([
        "none",
        "strat1",
        "strat2",
        "strat3",
        "strat4"
    ]),

    ejectMode: spendOptions,

    supplyMode: spendOptions,

    naniteMode: spendOptions,

    shifterGenus: genusOptions,

    imitateRace: genusOptions,

    buildingShrineType: {
        any: "Any",
        equally: "Equally",
        morale: "Morale",
        metal: "Metal",
        know: "Knowledge",
        tax: "Tax"
    },

    // Todo
    psychicPower: {
        none: "None",
        auto: "Script Managed",
        ...fromArray([
            "boost",
            "murder",
            "assault",
            "profit",
            "stun",
            "mind_break"
        ])
    },

    psychicBoostRes: {
        auto: "Script Managed",
        ...ejectableResources
    },

    geneticsSequence: fromArrayCapitalized([
        "none",
        "enabled",
        "disabled",
        "decode"
    ]),

    geneticsBoost: fromArrayCapitalized([
        "none",
        "enabled",
        "disabled"
    ]),

    geneticsAssemble: {
        none: "Ignore",
        enabled: "Enable",
        disabled: "Disable",
        auto: "Script Managed"
    }
};