import type { ParseError } from "../parser/model";

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: string,
    value: any
}

export type Statement = SettingAssignment;

export type CompilationResult = {
    config: any,
    errors: ParseError[]
}
