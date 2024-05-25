import { expressions, otherExpressions, otherExpressionsAliases } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import { CompileError } from "../model";
import { StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model/6";

function getSettingType(setting: Parser.Identifier): string {
    const type = settingType(setting.value);
    if (type === undefined) {
        throw new CompileError(`Unknown setting ID '${setting.value}'`, setting);
    }

    return type;
}

function checkType(type: string, expected: string, node: Parser.Expression | Parser.Identifier) {
    if (type === "unknown" || expected === "unknown") {
        return;
    }

    if (type !== expected) {
        throw new CompileError(`Expected ${expected}, got ${type}`, node);
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
                throw new CompileError("Unknown identifier", expression.base);
            }

            // allowedValues is only null for Eval which isn't a subscript
            if (!info.allowedValues!.includes(expression.key.value)) {
                throw new CompileError(`'${expression.key.value}' is not a valid ${info.valueDescription}`, expression.key);
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
            throw new CompileError(`Unknown operator '${expression.operator}'`, expression);
        }
    }
}

class Impl extends StatementVisitor<Parser.Statement> {
    private visitor = new Validator();

    onSettingAssignment(statement: Parser.SettingAssignment) {
        const valueType = this.visitor.visit(statement.value);
        checkType(valueType, getSettingType(statement.setting), statement.value);

        if (statement.condition) {
            const conditionType = this.visitor.visit(statement.condition);
            checkType(conditionType, "boolean", statement.condition);
        }
    }

    onSettingShift(statement: Parser.SettingShift) {
        checkType(getSettingType(statement.setting), "string[]", statement.value);

        if (statement.condition) {
            const conditionType = this.visitor.visit(statement.condition);
            checkType(conditionType, "boolean", statement.condition);
        }
    }

    onConditionPush(statement: Parser.ConditionPush) {
        const conditionType = this.visitor.visit(statement.condition);
        checkType(conditionType, "boolean", statement.condition);
    }
};

export function validateTypes(statements: Parser.Statement[], sourceMap: SourceMap, errors: CompileError[]): Parser.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
