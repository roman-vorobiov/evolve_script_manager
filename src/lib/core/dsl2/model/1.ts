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
    key: Expression | Symbol
}

export type CompoundExpression = {
    type: "Expression",
    operator: string,
    args: Expression[]
}

export type Constant = StringLiteral | NumberLiteral | BooleanLiteral;

export type SimpleExpression = Constant | EvalLiteral | Identifier;

export type Expression = SimpleExpression | Subscript | List | CompoundExpression;

export type SettingAssignment<T = Expression> = {
    type: "SettingAssignment",
    setting: T,
    value: T,
    condition?: T
}

export type ConditionPush<T = Expression> = {
    type: "ConditionPush",
    condition: T
}

export type ConditionPop = {
    type: "ConditionPop"
}

export type TriggerArgument = {
    type: Identifier,
    id: Identifier,
    count?: NumberLiteral
}

export type Trigger = {
    type: "Trigger",
    condition: TriggerArgument,
    actions: TriggerArgument[]
}

export type Statement = SettingAssignment | ConditionPush | ConditionPop | Trigger;
