import { ParseError } from "../model";
import { BasePostProcessor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/3";
import type * as After from "../model/4";

type ReferenceGetter = (placeholder: Before.Symbol) => After.Identifier;

function throwOnPlaceholder(placeholder: Before.Symbol): never {
    throw new ParseError("Placeholder used without the context to resolve it", placeholder);
}

function makeReferenceGetter(node: Before.Identifier | Before.Subscript): ReferenceGetter {
    if (node.type === "Subscript") {
        if (node.key.type === "Identifier") {
            return (placeholder: Before.Symbol) => node.key as After.Identifier;
        }
        else if (node.key.type === "Placeholder") {
            throwOnPlaceholder(node.key);
        }
        else {
            throw new ParseError("Invalid setting", node);
        }
    }

    return throwOnPlaceholder;
}

export class PlaceholderResolver extends BasePostProcessor {
    constructor(sourceMap: SourceMap, private getter: ReferenceGetter) {
        super(sourceMap);
    }

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

    private processSubscript(expression: Before.Subscript): After.Subscript {
        if (expression.key.type === "Placeholder") {
            return this.derived(expression, { key: this.getter(expression.key) });
        }
        else if (expression.key.type === "Subscript") {
            const newKey = this.processSubscript(expression.key);

            if (newKey !== expression.key) {
                return this.derived(expression, { key: newKey });
            }
        }

        return expression as After.Subscript;
    }
}

export function resolvePlaceholders(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    function processSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const getter = makeReferenceGetter(statement.setting);
        const impl = new PlaceholderResolver(sourceMap, getter);

        const newValue = impl.processExpression(statement.value);
        const newCondition = statement.condition && impl.processExpression(statement.condition);

        if (newValue !== statement.value || newCondition !== statement.condition) {
            return impl.derived(statement, {
                setting: statement.setting as After.SettingAssignment["setting"],
                value: newValue,
                condition: newCondition
            });
        }
        else {
            return statement as After.SettingAssignment;
        }
    }

    function processConditionPush(statement: Before.ConditionPush): After.ConditionPush {
        const impl = new PlaceholderResolver(sourceMap, throwOnPlaceholder);

        impl.processExpression(statement.condition);

        return statement as After.ConditionPush;
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
