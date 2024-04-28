export type Position = {
    line: number,
    column: number
}

export type SourceLocation = {
    start: Position,
    stop: Position
}

export type SourceTracked<T> = T & { location: SourceLocation }

export type CallExpression = {
    name: SourceTracked<String>,
    argument: SourceTracked<String>
}

export type Setting = {
    name?: SourceTracked<String>,
    expression?: CallExpression
}

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Setting,
    value: SourceTracked<String | Number | Boolean>
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
