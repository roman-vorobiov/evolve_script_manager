import buildings from "./buildings";
import techs from "./tech";
import projects from "./projects";

export const triggerActions = {
    Build:    { type: "building", allowedValues: buildings },
    Research: { type: "tech",     allowedValues: techs },
    Arpa:     { type: "project",  allowedValues: projects }
}
