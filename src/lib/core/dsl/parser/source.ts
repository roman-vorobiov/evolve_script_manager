export type Position = {
    line: number,
    column: number
}

export type SourceLocation = {
    start: Position,
    stop: Position
}

export type SourceTracked<T> = T & {
    location: SourceLocation
}
