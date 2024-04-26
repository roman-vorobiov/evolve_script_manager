type Position = {
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
    value: SourceTracked<any>
}

export type Node = SourceTracked<SettingAssignment>;

export type ParseError = SourceLocation & {
    message: string
}

export type ParseResult = {
    nodes: Node[],
    errors: ParseError[]
}
