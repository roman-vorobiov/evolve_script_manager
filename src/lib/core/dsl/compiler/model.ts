import type { ParseError } from "../parser/model";

type Value = string | number | boolean;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: string,
    value: Value
}

export type TriggerArgument = {
    type: string,
    id: string,
    count: number
}

export type Trigger = {
    type: "Trigger",
    action: TriggerArgument,
    condition: TriggerArgument
}

export type Statement = SettingAssignment | Trigger;

export type CompilationResult = {
    statements: Statement[],
    errors: ParseError[]
}
