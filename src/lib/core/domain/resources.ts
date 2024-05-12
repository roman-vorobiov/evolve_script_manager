export const evolutionResources = {
    RNA: "RNA",
    DNA: "DNA",
}

export const baseResources = {
    Money: "Money",
    Population: "Population",
    Slave: "Slave",
    Mana: "Mana",
    Energy: "Energy",
    Sus: "Suspicion",
    Knowledge: "Knowledge",
    Zen: "Zen",
    Crates: "Crates",
    Containers: "Containers",
}

export const tradableResources = {
    Food: "Food",
    Lumber: "Lumber",
    Chrysotile: "Chrysotile",
    Stone: "Stone",
    Crystal: "Crystal",
    Furs: "Furs",
    Copper: "Copper",
    Iron: "Iron",
    Aluminium: "Aluminium",
    Cement: "Cement",
    Coal: "Coal",
    Oil: "Oil",
    Uranium: "Uranium",
    Steel: "Steel",
    Titanium: "Titanium",
    Alloy: "Alloy",
    Polymer: "Polymer",
    Iridium: "Iridium",
    Helium_3: "Helium-3",
}

export const galaxyTradableResources = {
    Deuterium: "Deuterium",
    Neutronium: "Neutronium",
    Adamantite: "Adamantite",
    Elerium: "Elerium",
    Nano_Tube: "Nano Tube",
    Graphene: "Graphene",
    Stanene: "Stanene",
    Bolognium: "Bolognium",
    Vitreloy: "Vitreloy",
}

export const advancedResources = {
    ...galaxyTradableResources,
    Water: "Water",
    Infernite: "Infernite",
    Orichalcum: "Orichalcum",
    Unobtainium: "Unobtainium",
    Materials: "Materials",

    Horseshoe: "Horseshoe",
    Nanite: "Nanite",
    Genes: "Genes",
    Soul_Gem: "Soul Gem",
}

export const alchemyResources = {
    ...tradableResources,
    ...galaxyTradableResources,
    Water: "Water",
    Infernite: "Infernite",
    Orichalcum: "Orichalcum",
}

export const craftableResources = {
    Plywood: "Plywood",
    Brick: "Brick",
    Wrought_Iron: "Wrought Iron",
    Sheet_Metal: "Sheet Metal",
    Mythril: "Mythril",
    Aerogel: "Aerogel",
    Nanoweave: "Nanoweave",
    Scarletite: "Scarletite",
    Quantium: "Quantium",
}

export const manufacturableResources = [
    "Money",
    "Furs",
    "Alloy",
    "Polymer",
    "Nano_Tube",
    "Stanene",
]

export const minableResources = [
    "Adamantite",
    "Aluminium",
    "Uranium",
    "Coal",
]

export const storableResources = [
    "Orichalcum",
    "Vitreloy",
    "Bolognium",
    "Stanene",
    "Graphene",
    "Adamantite",
    "Iridium",
    "Polymer",
    "Alloy",
    "Titanium",
    "Steel",
    "Coal",
    "Cement",
    "Aluminium",
    "Iron",
    "Copper",
    "Furs",
    "Crystal",
    "Stone",
    "Chrysotile",
    "Lumber",
    "Food",
]

export const ejectableResources = {
    ...tradableResources,
    ...galaxyTradableResources,
    Water: "Water",
    Infernite: "Infernite",
    Orichalcum: "Orichalcum",
    Unobtainium: "Unobtainium",
    ...craftableResources
}

export const supplyResources = Object.keys(ejectableResources).filter(res => {
    return res !== "Food" &&
           res !== "Water" &&
           res !== "Unobtanium" &&
           res !== "Quantum"
});

export const naniteResources = [
    "Uranium",
    "Iridium",
    "Polymer",
    "Copper",
    "Steel",
    "Iron",
    "Titanium",
    "Alloy",
    "Aluminium",
    "Stone",
    "Cement",
    "Chrysotile",
    "Furs",
    "Coal",
    "Lumber",
    "Oil",
    "Crystal",
    "Helium_3",
]

export const specialResources = {
    Corrupt_Gem: "Corrupt Gem",
    Codex: "Codex",
    Cipher: "Encrypted Data",
    Demonic_Essence: "Demonic Essence",
}

export const prestigeResources = {
    Blood_Stone: "Blood Stone",
    Artifact: "Artifact",
    Plasmid: "Plasmid",
    AntiPlasmid: "Anti-Plasmid",
    Phage: "Phage",
    Dark: "Dark",
    Harmony: "Harmony",
    AICore: "AI Core",
}

export const pseudoResources = {
    Supply: "Supplies",
    Power: "Power",
    Morale: "Morale",
    Thrall: "Thrall",

    Womlings_Support: "Womlings",
    Moon_Support: "Moon Support",
    Red_Support: "Red Support",
    Sun_Support: "Sun Support",
    Belt_Support: "Belt Support",
    Titan_Support: "Titan Support",
    Electrolysis_Support: "Electrolysis Plant",
    Enceladus_Support: "Enceladus Support",
    Eris_Support: "Eris Support",

    Tau_Support: "Tau Ceti Support",
    Tau_Red_Support: "Tau Ceti Red Support",
    Tau_Belt_Support: "Tau Ceti Belt Support",

    Alpha_Support: "Alpha Support",
    Nebula_Support: "Nebula Support",
    Gateway_Support: "Gateway Support",
    Alien_Support: "Alien Support",
    Lake_Support: "Lake Support",
    Spire_Support: "Spire Support",
}

export const resources = {
    ...evolutionResources,
    ...baseResources,
    ...tradableResources,
    ...advancedResources,
    ...craftableResources,
    ...specialResources,
    ...prestigeResources,
    ...pseudoResources
}
