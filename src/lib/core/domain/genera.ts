const baseGenera = {
    "eldritch": "Eldritch",
    "aquatic": "Aquatic",
    "insectoid": "Insectoid",
    "humanoid": "Humanoid",
    "giant": "Giant",
    "small": "Small",
    "carnivore": "Carnivore",
    "herbivore": "Herbivore",
    "demonic": "Demonic",
    "angelic": "Angelic",
    "fey": "Fey",
    "heat": "Heat",
    "polar": "Polar",
    "sand": "Sand",
    "avian": "Avian",
    "reptilian": "Reptilian",
    "plant": "Plant",
    "fungi": "Fungi"
};

export const playableGenera = {
    "organism": "Protoplasm",
    ...baseGenera,
    "synthetic": "Synthetic"
};

export const mimicGenera = {
    "none": "None",
    ...baseGenera
};
