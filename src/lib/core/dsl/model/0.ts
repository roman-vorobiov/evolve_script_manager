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
    values: Expression[],
    fold?: string
}

export type Subscript = {
    type: "Subscript",
    base: Identifier,
    key: Identifier | Symbol | Subscript | List,
    explicitKeyFold?: "and" | "or"
}

export type CompoundExpression = {
    type: "Expression",
    operator: string,
    args: Expression[]
}

export type Constant = StringLiteral | NumberLiteral | BooleanLiteral;

export type SimpleExpression = Constant | EvalLiteral | Identifier;

export type Expression = SimpleExpression | Subscript | List | CompoundExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Identifier | Subscript,
    value: Expression,
    condition?: Expression
}

export type SettingShift = {
    type: "SettingShift",
    setting: Identifier,
    values: (Identifier | StringLiteral)[],
    operator: string,
    condition?: Expression
}

export type ConditionBlock = {
    type: "ConditionBlock",
    condition: Expression,
    body: Statement[]
}

export type TriggerArgument = {
    type: Identifier,
    id: Identifier,
    count?: NumberLiteral | Identifier
}

export type Trigger = {
    type: "Trigger",
    condition: TriggerArgument,
    actions: TriggerArgument[]
}

export type ExpressionDefinition = {
    type: "ExpressionDefinition",
    name: Identifier,
    body: Expression,
    parameterized: boolean
}

export type Statement =
    SettingAssignment |
    SettingShift |
    ConditionBlock |
    Trigger |
    ExpressionDefinition;
