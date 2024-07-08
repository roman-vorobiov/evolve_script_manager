import buildings from "./buildings";
import techNames from "./tech";
import projects from "./projects";

const techs = Object.fromEntries(Object.entries(techNames).map(([id, names]) => [id, names[0]]));

export const triggerConditions = {
    Unlocked:   { type: "tech",     allowedValues: techs },
    Researched: { type: "tech",     allowedValues: techs },
    Built:      { type: "building", allowedValues: buildings }
}

export const triggerActions = {
    Build:    { type: "building", allowedValues: buildings },
    Research: { type: "tech",     allowedValues: techs },
    Arpa:     { type: "project",  allowedValues: projects }
}
