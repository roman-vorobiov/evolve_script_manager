import { prefixes } from "$lib/core/domain/settings";
import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model";

export class WildcardResolver extends BasePostProcessor {
    constructor(sourceMap: SourceMap) {
        super(sourceMap);
    }

    override processExpression(expression: Parser.Expression): Parser.Expression {
        if (expression.type === "Subscript") {
            return this.processSubscript(expression);
        }
        else if (expression.type === "Expression") {
            const newArgs = expression.args.map(arg => this.processExpression(arg) ?? arg);

            if (newArgs.some((arg, i) => arg !== expression.args[i])) {
                return this.derived(expression, { args: newArgs });
            }
        }

        return expression;
    }

    private processSubscript(expression: Parser.Subscript): Parser.Subscript {
        if (expression.key.type === "Wildcard") {
            const prefixInfo = prefixes[expression.base.value];
            if (prefixInfo === undefined) {
                throw new ParseError("Wildcards are only supported for setting prefixes", expression.key);
            }

            const newKey = this.makeIdentifierList(prefixInfo.allowedSuffixes, expression.key);

            return this.derived(expression, { key: newKey });
        }
        else if (expression.key.type === "List") {
            const newKey = this.processList(expression.key);

            if (newKey !== undefined) {
                return this.derived(expression, { key: newKey });
            }
        }

        return expression;
    }

    private processList(list: Parser.List): Parser.List {
        const newValues = list.values.map(value => this.processExpression(value) ?? value);

        if (newValues.some((value, i) => value !== list.values[i])) {
            return this.derived(list, { values: newValues });
        }

        return list;
    }

    private makeIdentifierList(values: string[], originalNode: Parser.Symbol): Parser.List {
        return this.deriveLocation(originalNode, {
            type: "List",
            values: values.map(suffix => this.deriveLocation(originalNode, { type: "Identifier", value: suffix }))
        });
    }
}

export function resolveWildcards(statements: Parser.Statement[], sourceMap: SourceMap) {
    const impl = new WildcardResolver(sourceMap);

    function processExpressionIfNeeded(expression: Parser.Expression) {
        const newExpression = impl.processExpression(expression);
        if (newExpression !== expression) {
            return newExpression;
        }
    }

    function processSettingAssignment(statement: Parser.SettingAssignment): Parser.SettingAssignment {
        const newSetting = processExpressionIfNeeded(statement.setting);
        const newValue = processExpressionIfNeeded(statement.value);
        const newCondition = statement.condition && processExpressionIfNeeded(statement.condition);

        if (newSetting || newValue || newCondition) {
            return impl.derived(statement, {
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
        const newCondition = processExpressionIfNeeded(statement.condition);

        if (newCondition) {
            return impl.derived(statement, { condition: newCondition });
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
