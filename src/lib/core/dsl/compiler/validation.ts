import { expressions, otherExpressions, otherExpressionsAliases } from "$lib/core/domain/expressions";
import { settingType } from "$lib/core/domain/settings";
import settingEnums from "$lib/core/domain/settingEnums";
import { CompileError } from "../model";
import { StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model/6";
import { assert } from "$lib/core/utils/typeUtils";

function getSettingType(setting: Parser.Identifier): string {
    const type = settingType(setting.value);
    if (type === undefined) {
        throw new CompileError(`Unknown setting ID '${setting.value}'`, setting);
    }

    return type;
}

function checkType(type: string, expected: string, node: any) {
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

    onSettingAssignment(statement: Parser.SettingAssignment): Parser.SettingAssignment {
        const valueType = this.visitor.visit(statement.value);
        checkType(valueType, getSettingType(statement.setting), statement.value);

        const allowedValues = settingEnums[statement.setting.value];
        if (allowedValues !== undefined) {
            assert<Parser.StringLiteral>(statement.value);

            if (!(statement.value.value in allowedValues)) {
                throw new CompileError(`'${statement.value.value}' is not a valid value for '${statement.setting.value}'`, statement.value);
            }
        }

        if (statement.condition) {
            const conditionType = this.visitor.visit(statement.condition);
            checkType(conditionType, "boolean", statement.condition);
        }

        return statement;
    }

    onSettingShift(statement: Parser.SettingShift): Parser.SettingShift {
        if (!["logFilter", "researchIgnore"].includes(statement.setting.value)) {
            throw new CompileError("List manipulation is only supported for 'logFilter' and 'researchIgnore'", statement.setting);
        }

        if (statement.condition) {
            const conditionType = this.visitor.visit(statement.condition);
            checkType(conditionType, "boolean", statement.condition);
        }

        return statement;
    }

    onConditionBlock(statement: Parser.ConditionBlock, body: Parser.Statement[]): Parser.ConditionBlock {
        const conditionType = this.visitor.visit(statement.condition);
        checkType(conditionType, "boolean", statement.condition);

        return this.derived(statement, { body });
    }
};

export function validateTypes(statements: Parser.Statement[], sourceMap: SourceMap, errors: CompileError[]): Parser.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
