import type { Modify } from "$lib/core/utils/typeUtils";
import type * as Previous from "./8";

export type StringLiteral = Previous.StringLiteral;
export type NumberLiteral = Previous.NumberLiteral;
export type BooleanLiteral = Previous.BooleanLiteral;
export type EvalLiteral = Previous.EvalLiteral;
export type Identifier = Previous.Identifier;
export type Subscript = Previous.Subscript;
export type Constant = Previous.Constant;
export type SimpleExpression = Previous.SimpleExpression;

export type CompoundExpression = Modify<Previous.CompoundExpression, {
    args: SimpleExpression[]
}>

export type Expression = SimpleExpression | CompoundExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Identifier,
    value: SimpleExpression,
    condition?: Expression
}

export type SettingPush = Previous.SettingPush;

export type Trigger = Modify<Previous.Trigger, {
    condition: Expression | undefined,
}>;

export type Statement = SettingAssignment | SettingPush | Trigger;
