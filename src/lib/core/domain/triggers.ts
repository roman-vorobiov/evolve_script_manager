import buildings from "./buildings";
import tech from "./tech";
import projects from "./projects";

const techIds = Object.keys(tech);
const buildingIds = Object.keys(buildings);
const projectIds = Object.keys(projects);

export const triggerConditions = {
    Unlocked: techIds,
    Researched: techIds,
    Built: buildingIds
}

export const triggerActions = {
    Build: buildingIds,
    Research: techIds,
    Arpa: projectIds
}
