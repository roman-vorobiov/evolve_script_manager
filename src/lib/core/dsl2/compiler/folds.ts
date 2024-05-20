import { settingType, prefixes } from "$lib/core/domain/settings";
import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { assume, assert } from "$lib/core/utils/typeUtils";
import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/2";
import * as After from "../model/3";

function isBooleanOperator(operator: string) {
    return !["+", "-", "*", "/"].includes(operator);
}

function isBooleanExpression(base: Before.Identifier, keys: Before.List): boolean {
    const expressionInfo = expressions[base.value] ?? otherExpressions[base.value];
    if (expressionInfo === undefined) {
        return false;
    }

    const type = expressionInfo.type ?? getCommonSettingsType(keys);

    return type === "boolean";
}

function validateExpressionResolved(expression: Before.Expression): asserts expression is After.Expression {
    if (expression.type === "List") {
        throw new ParseError("Fold expression detected outside of a boolean expression", expression);
    }
}

function getCommonSettingsType(settings: Before.List): string {
    function getSettingType(setting: Before.Expression): string | undefined {
        if (setting.type === "Identifier") {
            const type = settingType(setting.value);
            if (type === undefined) {
                throw new ParseError("Invalid setting", setting);
            }
            return type;
        }
        else if (setting.type === "Subscript") {
            const prefixInfo = prefixes[setting.base.value];
            if (prefixInfo === undefined) {
                throw new ParseError("Invalid setting", setting.base);
            }
            return prefixInfo.type;
        }
    }

    const types = new Set(settings.values.map(getSettingType));
    if (types.size !== 1) {
        throw new ParseError("Only settings of the same type are allowed to be in the same list", settings);
    }

    return types.values().next().value;
}

export class FoldResolver extends BasePostProcessor {
    override processExpression(expression: Before.Expression): Before.Expression {
        if (expression.type === "List") {
            return this.processList(expression);
        }
        else if (expression.type === "Subscript") {
            return this.processSubscript(expression);
        }
        else if (expression.type === "Expression") {
            return this.processCompoundExpression(expression);
        }
        else {
            return expression;
        }
    }

    private processList(list: Before.List): Before.List {
        const newValues = list.values.map(value => this.processExpression(value));

        // Throw on nested lists
        if (newValues.some(value => value.type === "List")) {
            throw new ParseError("Only one fold subexpression is allowed", list);
        }

        if (newValues.some((value, i) => value !== list.values[i])) {
            return this.derived(list, { values: newValues });
        }

        return list;
    }

    private processSubscript(expression: Before.Subscript): Before.Expression {
        if (expression.key.type === "Placeholder") {
            return expression;
        }

        assert<Before.Expression>(expression.key);

        const newKey = this.processExpression(expression.key);

        if (newKey.type === "List") {
            // Transform each element as the subscript of `expression.base`
            const node = this.derived(newKey, {
                values: newKey.values.map(key => this.derived(expression, <After.Subscript> { key }))
            });

            // If the base is a boolean setting prefix or condition expression, fold the list
            return isBooleanExpression(expression.base, newKey) ? this.foldLeft(node) : node;
        }

        if (newKey !== expression.key) {
            // Unreachable
            throw new ParseError("Internal error: unexpected path taken during fold expression resolution", expression);
        }

        return expression;
    }

    private processCompoundExpression(expression: Before.CompoundExpression): Before.Expression {
        const args = expression.args.map(arg => this.processExpression(arg));

        const numberOfFolds = args.filter(arg => arg.type === "List").length;

        if (numberOfFolds > 1) {
            // Instead of engaging in arbitrary combinatorics, just reject such cases
            throw new ParseError("Only one fold subexpression is allowed", expression);
        }
        else if (numberOfFolds === 0) {
            if (args.some((arg, i) => arg !== expression.args[i])) {
                // No folds directly as subexpressions, but some have been found and resolved down the tree
                return this.derived(expression, { args });
            }
            else {
                return expression;
            }
        }
        else if (args.length === 1) {
            // This means the argument of 'not' is not boolean, but it's not this component's job to guard against that
            return this.derived(expression, { args: [this.foldLeft(args[0] as Before.List)] });
        }
        else {
            let node: Before.List;
            if (args[0].type === "List") {
                // foo[a, b] / 2 -> [foo.a / 2, foo.b / 2]
                node = this.derived(args[0], {
                    values: args[0].values.map(arg => this.derived(expression, { args: [arg, args[1]] }))
                });
            }
            else {
                assume(args[1].type === "List");
                // 2 / foo[a, b] -> [2 / foo.a, 2 / foo.b]
                node = this.derived(args[1], {
                    values: args[1].values.map(arg => this.derived(expression, { args: [args[0], arg] }))
                });
            }

            return isBooleanOperator(expression.operator) ? this.foldLeft(node) : node;
        }
    }

    private foldLeft(expresson: Before.List): After.Expression {
        if (expresson.fold === undefined) {
            throw new ParseError("Ambiguous fold expression: use 'and' or 'or' instead of the last comma", expresson);
        }

        return expresson.values.reduce((l, r) => {
            return this.deriveLocation(expresson, <After.Expression> {
                type: "Expression",
                operator: expresson.fold,
                args: [l, r]
            });
        }) as After.Expression;
    }
}

export function resolveFolds(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new FoldResolver(sourceMap);

    function* processConditionPush(statement: Before.ConditionPush): IterableIterator<After.ConditionPush> {
        const newCondition = impl.processExpression(statement.condition);

        if (newCondition !== statement.condition) {
            validateExpressionResolved(newCondition);
            yield impl.derived(statement, { condition: newCondition });
        }
        else {
            yield statement as After.ConditionPush;
        }
    }

    function* processSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const newSetting = impl.processExpression(statement.setting);
        const newValue = impl.processExpression(statement.value);
        const newCondition = statement.condition && impl.processExpression(statement.condition);

        if (newSetting !== statement.setting || newCondition !== statement.condition || newValue !== statement.value) {
            validateExpressionResolved(newValue);

            if (newCondition) {
                validateExpressionResolved(newCondition);
            }

            if (newSetting.type === "List") {
                if (newSetting.fold === "or") {
                    throw new ParseError("Disjunction is not allowed in setting targets", newSetting);
                }

                for (const setting of newSetting.values) {
                    yield impl.derived(statement, {
                        setting: setting as After.SettingAssignment["setting"],
                        value: newValue,
                        condition: newCondition
                    });
                }
            }
            else {
                yield impl.derived(statement, {
                    setting: newSetting as After.SettingAssignment["setting"],
                    value: newValue,
                    condition: newCondition
                });
            }
        }
        else {
            yield statement as After.SettingAssignment;
        }
    }

    function* processStatement(statement: Before.Statement): IterableIterator<After.Statement> {
        if (statement.type === "SettingAssignment") {
            yield* processSettingAssignment(statement);
        }
        else if (statement.type === "ConditionPush") {
            yield* processConditionPush(statement);
        }
        else {
            yield statement;
        }
    }

    function* processStatements(statements: Before.Statement[]): IterableIterator<After.Statement> {
        for (const statement of statements) {
            yield* processStatement(statement);
        }
    }

    return [...processStatements(statements)];
}
