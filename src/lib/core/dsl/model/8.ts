import type * as Previous from "./8_intermediate";

export type StringLiteral = Previous.StringLiteral;
export type NumberLiteral = Previous.NumberLiteral;
export type BooleanLiteral = Previous.BooleanLiteral;
export type EvalLiteral = Previous.EvalLiteral;
export type Identifier = Previous.Identifier;
export type Subscript = Previous.Subscript;
export type Constant = Previous.Constant;
export type CompoundExpression = Previous.CompoundExpression;
export type SimpleExpression = Previous.SimpleExpression;
export type Expression = Previous.Expression;

export type SettingAssignment = Previous.SettingAssignment;
export type SettingPush = Previous.SettingPush;
export type Trigger = Previous.Trigger;

export type Statement = Exclude<Previous.Statement, Previous.SettingShift | Previous.SettingShiftBlock>;
