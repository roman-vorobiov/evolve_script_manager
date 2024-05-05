import type { SourceTracked, SourceLocation } from "./source";

export type ParseError = {
    message: string,
    location: SourceLocation
}

export type Expression = {
    op: SourceTracked<String>,
    arguments: SourceTracked<Expression | Value | CallExpression>[]
}

export type Value = String | Number | Boolean;

export type CallExpression = {
    name: SourceTracked<String>,
    arguments: SourceTracked<Value>[]
}

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: SourceTracked<CallExpression>,
    value: SourceTracked<Value>,
    condition?: SourceTracked<Expression | Value | CallExpression>
}

export type Trigger = {
    type: "Trigger",
    condition: SourceTracked<CallExpression>,
    action: SourceTracked<CallExpression>
}

export type TriggerChain = {
    type: "TriggerChain",
    condition: SourceTracked<CallExpression>,
    actions: SourceTracked<CallExpression>[]
}

export type Node = SettingAssignment | Trigger | TriggerChain;

export type ParseResult = {
    nodes: SourceTracked<Node>[],
    errors: ParseError[]
}
