import type * as Previous from "./8";

export type StringLiteral = Previous.StringLiteral;
export type NumberLiteral = Previous.NumberLiteral;
export type BooleanLiteral = Previous.BooleanLiteral;
export type EvalLiteral = Previous.EvalLiteral;
export type Identifier = Previous.Identifier;
export type Subscript = Previous.Subscript;
export type Constant = Previous.Constant;
export type SimpleExpression = Previous.SimpleExpression;
export type CompoundExpression = Previous.CompoundExpression
export type Expression = Previous.Expression;

export type SettingAssignment = Previous.SettingAssignment;
export type SettingPush = Previous.SettingPush;

export type TriggerArgument = {
    type: Identifier,
    id: Identifier,
    count: NumberLiteral
}

export type Trigger = {
    type: "Trigger",
    requirement: TriggerArgument,
    action: TriggerArgument,
    condition: EvalLiteral | undefined
}

export type Statement = SettingAssignment | SettingPush | Trigger;
