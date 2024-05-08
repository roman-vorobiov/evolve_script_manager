import defaultSettings from "$lib/assets/default.json";

export const settings = Object.keys(defaultSettings).filter(id => {
    return id !== "scriptName"
        && id !== "overrides"
        && id !== "triggers"
        && id !== "evolutionQueue"
        && id !== "researchIgnore";
});

export function settingType(id: string) {
    return typeof defaultSettings[id as keyof typeof defaultSettings];
}
