import type { Modify } from "$lib/core/utils/typeUtils";
import type * as Previous from "./4";

export type StringLiteral = Previous.StringLiteral;
export type NumberLiteral = Previous.NumberLiteral;
export type BooleanLiteral = Previous.BooleanLiteral;
export type EvalLiteral = Previous.EvalLiteral;
export type Identifier = Previous.Identifier;
export type Constant = Previous.Constant;
export type SimpleExpression = Previous.SimpleExpression;

export type Subscript = Modify<Previous.Subscript, {
    key: Identifier
}>

export type CompoundExpression = Modify<Previous.CompoundExpression, {
    args: Expression[]
}>

export type Expression = SimpleExpression | Subscript | CompoundExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Identifier,
    value: Expression,
    condition?: Expression
}

export type SettingShift = Modify<Previous.SettingShift, {
    condition?: Expression
}>

export type SettingShiftBlock = Modify<Previous.SettingShiftBlock, {
    body: Statement[]
}>;

export type ConditionBlock = Modify<Previous.ConditionBlock, {
    condition: Expression,
    body: Statement[]
}>

export type Trigger = Previous.Trigger;

export type Statement = SettingAssignment | SettingShift | SettingShiftBlock | ConditionBlock | Trigger;
