export class ParseError extends Error {
    offendingEntity: any;

    constructor(message: string, offendingEntity: any) {
        super(message);
        this.offendingEntity = offendingEntity;
    }
}

export type Constant = String | Number | Boolean;

export type Identifier = {
    name: String,
    targets: String[],
    disjunction?: Boolean,
    placeholder?: Boolean,
    wildcard?: Boolean,
}

export type EvaluatedExpression = {
    operator: String,
    args: Expression[]
}

export type Expression = Constant | Identifier | EvaluatedExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Identifier,
    value: Expression,
    condition?: Expression
}

export type ConditionPush = {
    type: "ConditionPush",
    condition: Expression
}

export type ConditionPop = {
    type: "ConditionPop"
}

export type TriggerArgument = {
    type: String,
    id: String,
    count?: Number
}

export type Trigger = {
    type: "Trigger",
    condition: TriggerArgument,
    actions: TriggerArgument[]
}

export type Node = SettingAssignment | ConditionPush | ConditionPop | Trigger;
