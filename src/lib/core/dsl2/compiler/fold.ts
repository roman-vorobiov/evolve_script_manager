import { settingType, prefixes } from "$lib/core/domain/settings";
import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { assume, assert } from "$lib/core/utils/typeUtils";
import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model";

function isBooleanOperator(operator: string) {
    return !["+", "-", "*", "/"].includes(operator);
}

function isBooleanExpression(base: Parser.Identifier, keys: Parser.List): boolean {
    const expressionInfo = expressions[base.value] ?? otherExpressions[base.value];
    if (expressionInfo === undefined) {
        return false;
    }

    const type = expressionInfo.type ?? getCommonSettingsType(keys);

    return type === "boolean";
}

function validateExpressionResolved(expression: Parser.Expression) {
    if (expression.type === "List") {
        throw new ParseError("Fold expression detected outside of a boolean expression", expression);
    }
}

function getCommonSettingsType(settings: Parser.List): string {
    function getSettingType(setting: Parser.Expression): string | undefined {
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
    constructor(sourceMap: SourceMap) {
        super(sourceMap);
    }

    override processExpression(expression: Parser.Expression): Parser.Expression {
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

    private processList(list: Parser.List): Parser.List {
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

    private processSubscript(expression: Parser.Subscript): Parser.Expression {
        if (expression.key.type === "Placeholder") {
            return expression;
        }

        assert<Parser.Expression>(expression.key);

        const newKey = this.processExpression(expression.key);

        if (newKey.type === "List") {
            // Transform each element as the subscript of `expression.base`
            const node = this.derived(newKey, {
                values: newKey.values.map(key => this.derived(expression, { key }))
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

    private processCompoundExpression(expression: Parser.CompoundExpression): Parser.Expression {
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
            return this.derived(expression, { args: [this.foldLeft(args[0] as Parser.List)] });
        }
        else {
            let node: Parser.List;
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

    private foldLeft(expresson: Parser.List): Parser.Expression {
        if (expresson.fold === undefined) {
            throw new ParseError("Ambiguous fold expression: use 'and' or 'or' instead of the last comma", expresson);
        }

        return expresson.values.reduce((l, r) => {
            return this.deriveLocation(expresson, <Parser.Expression> {
                type: "Expression",
                operator: expresson.fold,
                args: [l, r]
            });
        });
    }
}

export function resolveFolds(statements: Parser.Statement[], sourceMap: SourceMap) {
    const impl = new FoldResolver(sourceMap);

    function processExpressionIfNeeded(expression: Parser.Expression) {
        const newExpression = impl.processExpression(expression);
        if (newExpression !== expression) {
            return newExpression;
        }
    }

    function* processConditionPush(statement: Parser.ConditionPush): IterableIterator<Parser.ConditionPush> {
        const newCondition = processExpressionIfNeeded(statement.condition);

        if (newCondition) {
            validateExpressionResolved(newCondition);
            yield impl.derived(statement, { condition: newCondition });
        }
        else {
            yield statement;
        }
    }

    function* processSettingAssignment(statement: Parser.SettingAssignment): IterableIterator<Parser.SettingAssignment> {
        const newSetting = processExpressionIfNeeded(statement.setting);
        const newValue = processExpressionIfNeeded(statement.value);
        const newCondition = statement.condition && processExpressionIfNeeded(statement.condition);

        if (newSetting || newCondition || newValue) {
            newValue && validateExpressionResolved(newValue);
            newCondition && validateExpressionResolved(newCondition);

            if (newSetting?.type === "List") {
                if (newSetting.fold === "or") {
                    throw new ParseError("Disjunction is not allowed in setting targets", newSetting);
                }

                for (const setting of newSetting.values) {
                    yield impl.derived(statement, {
                        setting,
                        value: newValue ?? statement.value,
                        condition: newCondition ?? statement.condition
                    });
                }
            }
            else {
                yield impl.derived(statement, {
                    setting: newSetting ?? statement.setting,
                    value: newValue ?? statement.value,
                    condition: newCondition ?? statement.condition
                });
            }
        }
        else {
            yield statement;
        }
    }

    function* processStatement(statement: Parser.Statement): IterableIterator<Parser.Statement> {
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

    function* processStatements(statements: Parser.Statement[]): IterableIterator<Parser.Statement> {
        for (const statement of statements) {
            yield* processStatement(statement);
        }
    }

    return [...processStatements(statements)];
}
