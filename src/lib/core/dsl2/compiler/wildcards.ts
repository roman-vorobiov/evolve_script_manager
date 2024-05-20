import { prefixes } from "$lib/core/domain/settings";
import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/1";
import type * as After from "../model/2";

export class WildcardResolver extends BasePostProcessor {
    override processExpression(expression: Before.Expression): After.Expression {
        if (expression.type === "Subscript") {
            return this.processSubscript(expression);
        }
        else if (expression.type === "Expression") {
            const newArgs = expression.args.map(arg => this.processExpression(arg) ?? arg);

            if (newArgs.some((arg, i) => arg !== expression.args[i])) {
                return this.derived(expression, { args: newArgs });
            }
        }

        return expression as After.Expression;
    }

    private processSubscript(expression: Before.Subscript): After.Subscript {
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

        return expression as After.Subscript;
    }

    private processList(list: Before.List): After.List {
        const newValues = list.values.map(value => this.processExpression(value) ?? value);

        if (newValues.some((value, i) => value !== list.values[i])) {
            return this.derived(list, { values: newValues });
        }

        return list as After.List;
    }

    private makeIdentifierList(values: string[], originalNode: Before.Symbol): After.List {
        return this.deriveLocation(originalNode, {
            type: "List",
            values: values.map(suffix => this.deriveLocation(originalNode, { type: "Identifier", value: suffix }))
        });
    }
}

export function resolveWildcards(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new WildcardResolver(sourceMap);

    function processSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const newSetting = impl.processExpression(statement.setting) as After.SettingAssignment["setting"];
        const newValue = impl.processExpression(statement.value);
        const newCondition = statement.condition && impl.processExpression(statement.condition);

        if (newSetting !== statement.setting || newValue !== statement.value || newCondition !== statement.condition) {
            return impl.derived(statement, {
                setting: newSetting,
                value: newValue,
                condition: newCondition
            });
        }
        else {
            return statement as After.SettingAssignment;
        }
    }

    function processConditionPush(statement: Before.ConditionPush): After.ConditionPush {
        const newCondition = impl.processExpression(statement.condition);

        if (newCondition !== statement.condition) {
            return impl.derived(statement, { condition: newCondition });
        }
        else {
            return statement as After.ConditionPush;
        }
    }

    function processStatement(statement: Before.Statement): After.Statement {
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
