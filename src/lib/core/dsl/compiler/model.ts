import type { ParseError } from "../parser/model";

type Value = string | number | boolean;

export type ExpressionArgument = {
    type: string,
    value: Value
}

export type OverrideCondition = {
    op: string,
    left: ExpressionArgument,
    right: ExpressionArgument
}

export type Override = {
    type: "Override",
    target: string,
    condition: OverrideCondition,
    value: Value
}

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

export type Statement = SettingAssignment | Override | Trigger;

export type CompilationResult = {
    statements: Statement[],
    errors: ParseError[]
}
