export type Position = {
    line: number,
    column: number
}

export type SourceLocation = {
    start: Position,
    stop: Position
}

export type SourceTracked<T> = T & { location: SourceLocation }

export type Value = String | Number | Boolean;

export type CallExpression = {
    name: SourceTracked<String>,
    arguments: SourceTracked<Value>[]
}

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: CallExpression,
    value: SourceTracked<Value>
}

export type Trigger = {
    type: "Trigger",
    condition: CallExpression,
    action: CallExpression
}

export type TriggerChain = {
    type: "TriggerChain",
    condition: CallExpression,
    actions: CallExpression[]
}

export type Node = SourceTracked<SettingAssignment | Trigger | TriggerChain>;

export type ParseError = {
    message: string,
    location: SourceLocation
}

export type ParseResult = {
    nodes: Node[],
    errors: ParseError[]
}
