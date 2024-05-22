import { expressions, otherExpressions, otherExpressionsAliases } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { ParseError } from "../model";

import type * as Parser from "../model/6";

function getSettingType(setting: Parser.Identifier): string {
    const type = settingType(setting.value);
    if (type === undefined) {
        throw new ParseError(`Unknown setting ID '${setting.value}'`, setting);
    }

    return type;
}

function checkType(type: string, expected: string, node: Parser.Expression) {
    if (type === "unknown" || expected === "unknown") {
        return;
    }

    if (type !== expected) {
        throw new ParseError(`Expected ${expected}, got ${type}`, node);
    }
}

export class Validator {
    visit(expression: Parser.Expression): string {
        if (expression.type === "Expression") {
            return this.visitExpression(expression);
        }
        else if (expression.type === "Subscript") {
            return this.visitSubscript(expression);
        }
        else if (expression.type === "Eval") {
            return "unknown";
        }
        else {
            return expression.type.toLowerCase();
        }
    }

    private visitSubscript(expression: Parser.Subscript): string {
        if (expression.base.value === "Other") {
            // 'Other' expressions are synthetic, so we don't need to validate them
            const alias = otherExpressionsAliases[expression.key.value as keyof typeof otherExpressionsAliases];
            return otherExpressions[alias].type;
        }
        else if (expression.base.value === "SettingCurrent" || expression.base.value === "SettingDefault") {
            return getSettingType(expression.key);
        }
        else {
            const info = expressions[expression.base.value];
            if (info === undefined) {
                throw new ParseError("Unknown identifier", expression.base);
            }

            // allowedValues is only null for Eval which isn't a subscript
            if (!info.allowedValues!.includes(expression.key.value)) {
                throw new ParseError(`'${expression.key.value}' is not a valid ${info.valueDescription}`, expression.key);
            }

            return info.type as string;
        }
    }

    private visitExpression(expression: Parser.CompoundExpression): string {
        if (["==", "!="].includes(expression.operator)) {
            checkType(this.visit(expression.args[1]), this.visit(expression.args[0]), expression.args[1]);
            return "boolean";
        }
        else if (["and", "or", "not"].includes(expression.operator)) {
            expression.args.forEach(arg => checkType(this.visit(arg), "boolean", arg));
            return "boolean";
        }
        else if (["<", "<=", ">", ">="].includes(expression.operator)) {
            expression.args.forEach(arg => checkType(this.visit(arg), "number", arg));
            return "boolean";
        }
        else if (["+", "-", "*", "/"].includes(expression.operator)) {
            expression.args.forEach(arg => checkType(this.visit(arg), "number", arg));
            return "number";
        }
        else {
            throw new ParseError(`Unknown operator '${expression.operator}'`, expression);
        }
    }
}

class Impl {
    private visitor = new Validator();

    visit(statement: Parser.Statement) {
        (this as any)[`on${statement.type}`]?.(statement);
    }

    onSettingAssignment(statement: Parser.SettingAssignment) {
        const valueType = this.visitor.visit(statement.value);
        checkType(valueType, getSettingType(statement.setting), statement.value);

        if (statement.condition) {
            const conditionType = this.visitor.visit(statement.condition);
            checkType(conditionType, "boolean", statement.condition);
        }
    }

    onConditionPush(statement: Parser.ConditionPush) {
        if (statement.condition) {
            const conditionType = this.visitor.visit(statement.condition);
            checkType(conditionType, "boolean", statement.condition);
        }
    }
};

export function validateTypes(statements: Parser.Statement[]): Parser.Statement[] {
    const impl = new Impl();

    for (const statement of statements) {
        impl.visit(statement);
    }

    return statements;
}
