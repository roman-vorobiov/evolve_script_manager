import type { SourceTracked, SourceLocation } from "./source";

export type ParseError = {
    message: string,
    location: SourceLocation
}

export type Constant = String | Number | Boolean;

export type Identifier = {
    name: SourceTracked<String>,
    targets: SourceTracked<String>[]
}

export type Expression = Constant | Identifier | {
    operator: SourceTracked<String>,
    args: SourceTracked<Expression>[]
}

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: SourceTracked<Identifier>,
    value: SourceTracked<Constant>,
    condition?: SourceTracked<Expression>
}

export type TriggerArgument = {
    type: SourceTracked<String>,
    id: SourceTracked<String>,
    count?: SourceTracked<Number>
}

export type Trigger = {
    type: "Trigger",
    condition: SourceTracked<TriggerArgument>,
    actions: SourceTracked<TriggerArgument>[]
}

export type Node = SettingAssignment | Trigger;

export type ParseResult = {
    nodes: SourceTracked<Node>[],
    errors: ParseError[]
}
