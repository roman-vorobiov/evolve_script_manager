export type Symbol = {
    type: "Wildcard" | "Placeholder"
}

export type StringLiteral = {
    type: "String",
    value: string
}

export type NumberLiteral = {
    type: "Number",
    value: number
}

export type BooleanLiteral = {
    type: "Boolean",
    value: boolean
}

export type EvalLiteral = {
    type: "Eval",
    value: string
}

export type Identifier = {
    type: "Identifier",
    value: string
}

export type List = {
    type: "List",
    values: Expression[]
}

export type FoldExpression = {
    type: "Fold",
    operator: string,
    arg: List | Identifier
}

export type Subscript = {
    type: "Subscript",
    base: Identifier,
    key: Identifier | Symbol | Subscript | List | FoldExpression
}

export type CompoundExpression = {
    type: "Expression",
    operator: string,
    args: Expression[]
}

export type Constant = StringLiteral | NumberLiteral | BooleanLiteral;

export type SimpleExpression = Constant | EvalLiteral | Identifier;

export type Expression = SimpleExpression | Subscript | List | FoldExpression | CompoundExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Identifier | Subscript,
    value: Expression,
    condition?: Expression
}

export type SettingShift = {
    type: "SettingShift",
    setting: Identifier,
    value: Identifier | List,
    operator: string,
    condition?: Expression
}

export type SettingShiftBlock = {
    type: "SettingShiftBlock",
    setting: Identifier,
    body: Statement[]
}

export type ConditionBlock = {
    type: "ConditionBlock",
    condition: Expression,
    body: Statement[]
}

export type TriggerAction = {
    type: Identifier,
    id: Identifier,
    count?: NumberLiteral | Identifier
}

export type Trigger = {
    type: "Trigger",
    actions: TriggerAction[]
}

export type ExpressionDefinition = {
    type: "ExpressionDefinition",
    name: Identifier,
    body: Expression,
    parameterized: boolean
}

export type StatementDefinition = {
    type: "StatementDefinition",
    name: Identifier,
    params: Identifier[],
    body: Statement[]
}

export type FunctionCall = {
    type: "FunctionCall",
    name: Identifier,
    args: Expression[]
}

export type Loop = {
    type: "Loop",
    iteratorName: Identifier,
    values: Identifier | List,
    body: Statement[]
}

export type Statement =
    SettingAssignment |
    SettingShift |
    SettingShiftBlock |
    ConditionBlock |
    Trigger |
    ExpressionDefinition |
    StatementDefinition |
    FunctionCall |
    Loop;
