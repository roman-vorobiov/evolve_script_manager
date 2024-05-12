import type { SourceTracked, SourceLocation } from "./source";
import { locationOf, type SourceEntity } from "./utils";

export class ParseError extends Error {
    location: SourceLocation;

    constructor(message: string, sourceEntity: SourceEntity) {
        super(message);
        this.location = locationOf(sourceEntity);
    }
}

export type Constant = String | Number | Boolean;

export type Identifier = {
    name: SourceTracked<String>,
    targets: SourceTracked<String>[],
    disjunction?: SourceTracked<Boolean>,
    placeholder?: SourceTracked<Boolean>
}

export type EvaluatedExpression = {
    operator: SourceTracked<String>,
    args: SourceTracked<Expression>[]
}

export type Expression = Constant | Identifier | EvaluatedExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: SourceTracked<Identifier>,
    value: SourceTracked<Constant>,
    condition?: SourceTracked<Expression>
}

export type ConditionPush = {
    type: "ConditionPush",
    condition: SourceTracked<Expression>
}

export type ConditionPop = {
    type: "ConditionPop"
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

export type Node = SettingAssignment | ConditionPush | ConditionPop | Trigger;

export type ParseResult = {
    nodes: SourceTracked<Node>[],
    errors: ParseError[]
}
