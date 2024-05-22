import buildings from "./buildings";
import tech from "./tech";
import projects from "./projects";

const techIds = Object.keys(tech);
const buildingIds = Object.keys(buildings);
const projectIds = Object.keys(projects);

export const triggerConditions = {
    Unlocked:   { type: "tech",     allowedValues: techIds },
    Researched: { type: "tech",     allowedValues: techIds },
    Built:      { type: "building", allowedValues: buildingIds }
}

export const triggerActions = {
    Build:    { type: "building", allowedValues: buildingIds },
    Research: { type: "tech",     allowedValues: techIds },
    Arpa:     { type: "project",  allowedValues: projectIds }
}
