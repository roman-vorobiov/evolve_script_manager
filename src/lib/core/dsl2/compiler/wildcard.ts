import { prefixes } from "$lib/core/domain/settings";
import { ParseError } from "../parser/model";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../parser/model";

export function resolveWildcards(statements: Parser.Statement[], sourceMap: SourceMap) {
    function deriveLocation<T1 extends object, T2 extends object>(original: T1, node: T2): T2 {
        sourceMap.deriveLocation(original, node);
        return node;
    }

    function derived<T extends object>(original: T, overrides: Partial<T>): T {
        return deriveLocation(original, { ...original, ...overrides });
    }

    function makeIdentifierList(values: string[], originalNode: Parser.Symbol): Parser.List {
        return deriveLocation(originalNode, {
            type: "List",
            values: values.map(suffix => deriveLocation(originalNode, <Parser.Identifier> { type: "Identifier", value: suffix }))
        });
    }

    function processSubscript(expression: Parser.Subscript): Parser.Subscript | undefined {
        if (expression.key.type === "Wildcard") {
            const prefixInfo = prefixes[expression.base.value];
            if (prefixInfo === undefined) {
                throw new ParseError("Wildcards are only supported for setting prefixes", expression.key);
            }

            const newKey = makeIdentifierList(prefixInfo.allowedSuffixes, expression.key);

            return derived(expression, { key: newKey });
        }
        else if (expression.key.type === "List") {
            const newKey = processList(expression.key);

            if (newKey !== undefined) {
                return derived(expression, { key: newKey });
            }
        }
    }

    function processList(list: Parser.List): Parser.List | undefined {
        const newValues = list.values.map(value => processExpression(value) ?? value);

        if (newValues.some((value, i) => value !== list.values[i])) {
            return derived(list, { values: newValues });
        }
    }

    function processExpression(expression: Parser.Expression): Parser.Expression | undefined {
        if (expression.type === "Subscript") {
            return processSubscript(expression);
        }
        else if (expression.type === "Expression") {
            const newArgs = expression.args.map(arg => processExpression(arg) ?? arg);

            if (newArgs.some((arg, i) => arg !== expression.args[i])) {
                return derived(expression, { args: newArgs });
            }
        }

        return expression;
    }

    function processSettingAssignment(statement: Parser.SettingAssignment): Parser.SettingAssignment {
        const newSetting = processExpression(statement.setting);
        const newValue = processExpression(statement.value);
        const newCondition = statement.condition && processExpression(statement.condition);

        if (newSetting || newValue || newCondition) {
            return derived(statement, {
                setting: newSetting ?? statement.setting,
                value: newValue ?? statement.value,
                condition: newCondition ?? statement.condition
            });
        }
        else {
            return statement;
        }
    }

    function processConditionPush(statement: Parser.ConditionPush): Parser.ConditionPush {
        const newCondition = processExpression(statement.condition);

        if (newCondition) {
            return derived(statement, { condition: newCondition });
        }
        else {
            return statement;
        }
    }

    function processStatement(statement: Parser.Statement): Parser.Statement {
        if (statement.type === "SettingAssignment") {
            return processSettingAssignment(statement);
        }
        else if (statement.type === "ConditionPush") {
            return processConditionPush(statement);
        }
        else {
            return statement;
        }
    }

    return statements.map(processStatement);
}
