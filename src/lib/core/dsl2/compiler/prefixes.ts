import { prefixes } from "$lib/core/domain/settings";
import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/4";
import type * as After from "../model/5";

export class PrefixResolver extends BasePostProcessor {
    override processExpression(expression: Before.Expression): After.Expression {
        if (expression.type === "Subscript") {
            return this.processSubscript(expression);
        }
        else if (expression.type === "Expression") {
            const newArgs = expression.args.map(arg => this.processExpression(arg));

            if (newArgs.some((arg, i) => arg !== expression.args[i])) {
                return this.derived(expression, { args: newArgs });
            }
        }

        return expression as After.Expression;
    }

    processSettingId(expression: Before.Identifier | Before.Subscript): After.Identifier {
        if (expression.type === "Identifier") {
            return expression;
        }

        if (expression.key.type !== "Identifier") {
            throw new ParseError("Identifier expected", expression.key);
        }

        const prefixInfo = prefixes[expression.base.value];
        if (prefixInfo === undefined) {
            throw new ParseError(`'${expression.base.value}' is not a valid setting prefix`, expression.base);
        }

        if (!prefixInfo.allowedSuffixes.includes(expression.key.value)) {
            throw new ParseError(`'${expression.key.value}' is not a valid ${prefixInfo.valueDescription} for ${expression.base.value}`, expression.base);
        }

        return this.derived(expression.key, { value: `${prefixInfo.prefix}${expression.key.value}` });
    }

    private processSubscript(expression: Before.Subscript): After.Subscript {
        if (expression.base.value === "SettingDefault" || expression.base.value === "SettingCurrent") {
            const newKey = this.processSettingId(expression.key);

            if (newKey !== expression.key) {
                return this.derived(expression, { key: newKey });
            }
        }
        else if (expression.key.type !== "Identifier") {
            throw new ParseError("Identifier expected", expression.key);
        }

        return expression as After.Subscript;
    }
}

export function resolvePrefixes(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new PrefixResolver(sourceMap);

    function processSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const newSetting = impl.processSettingId(statement.setting) as After.SettingAssignment["setting"];
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

        return statement;
    }

    return statements.map(processStatement);
}
