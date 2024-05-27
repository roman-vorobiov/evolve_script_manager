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
export type List = Previous.List;
export type Subscript = Previous.Subscript;
export type CompoundExpression = Previous.CompoundExpression;
export type Expression = Previous.Expression;

export type SettingAssignment = Previous.SettingAssignment;
export type SettingShift = Previous.SettingShift;
export type ConditionBlock = Previous.ConditionBlock;
export type TriggerArgument = Modify<Previous.TriggerArgument, {
    count: NumberLiteral
}>;
export type Trigger = Modify<Previous.Trigger, {
    condition: TriggerArgument,
    actions: TriggerArgument[]
}>;

type PrunedStatementTypes = Previous.ExpressionDefinition | Previous.StatementDefinition | Previous.FunctionCall;

export type Statement = Exclude<Previous.Statement, PrunedStatementTypes | Previous.Trigger> | Previous.Trigger;
