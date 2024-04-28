import type { ParseError } from "../parser/model";

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: string,
    value: any
}

export type Trigger = {
    type: "Trigger",
    actionType: string,
    actionId: string,
    actionCount: number,
    conditionType: string,
    conditionId: string,
    conditionCount: number
}

export type Statement = SettingAssignment | Trigger;

export type CompilationResult = {
    config: any,
    errors: ParseError[]
}
