import type { Modify } from "$lib/core/utils/typeUtils";
import type * as Previous from "./0";

export type Symbol = Previous.Symbol;
export type StringLiteral = Previous.StringLiteral;
export type NumberLiteral = Previous.NumberLiteral;
export type BooleanLiteral = Previous.BooleanLiteral;
export type EvalLiteral = Previous.EvalLiteral;
export type Identifier = Previous.Identifier;
export type Constant = Previous.Constant;
export type SimpleExpression = Previous.SimpleExpression;

export type List = Modify<Previous.List, {
    values: Expression[]
}>

export type FoldExpression = Modify<Previous.FoldExpression, {
    arg: List
}>

export type Subscript = Modify<Previous.Subscript, {
    key: Identifier | Symbol | Subscript | List | FoldExpression
}>

export type CompoundExpression = Modify<Previous.CompoundExpression, {
    args: Expression[]
}>

export type Expression = SimpleExpression | Subscript | List | FoldExpression | CompoundExpression;

export type SettingAssignment = {
    type: "SettingAssignment",
    setting: Identifier | Subscript,
    value: Expression,
    condition?: Expression
}

export type SettingShift = Modify<Omit<Previous.SettingShift, "value">, {
    values: Identifier[] | StringLiteral[],
    condition?: Expression
}>

export type SettingShiftBlock = Modify<Previous.SettingShiftBlock, {
    body: Statement[]
}>;

export type ConditionBlock = Modify<Previous.ConditionBlock, {
    condition: Expression,
    body: Statement[]
}>

export type TriggerAction = Modify<Previous.TriggerAction, {
    count: NumberLiteral
}>

export type Trigger = Modify<Previous.Trigger, {
    actions: TriggerAction[]
}>

export type Statement = SettingAssignment | SettingShift | SettingShiftBlock | ConditionBlock | Trigger;
