import { prefixes } from "$lib/core/domain/settings";
import { CompileError } from "../model";
import { ExpressionVisitor, StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/4";
import type * as After from "../model/5";

export class PrefixResolver extends ExpressionVisitor {
    visitSubscript(expression: Before.Subscript): After.Subscript {
        if (expression.base.value === "SettingDefault" || expression.base.value === "SettingCurrent") {
            const newKey = this.visitSettingId(expression.key);

            if (newKey !== expression.key) {
                return this.derived(expression, { key: newKey });
            }
        }
        else if (expression.key.type !== "Identifier") {
            throw new CompileError("Identifier expected", expression.key);
        }

        return expression as After.Subscript;
    }

    visitSettingId(expression: Before.Identifier | Before.Subscript): After.Identifier {
        if (expression.type === "Identifier") {
            return expression;
        }

        if (expression.key.type !== "Identifier") {
            throw new CompileError("Identifier expected", expression.key);
        }

        const prefixInfo = prefixes[expression.base.value];
        if (prefixInfo === undefined) {
            throw new CompileError(`'${expression.base.value}' is not a valid setting prefix`, expression.base);
        }

        if (!prefixInfo.allowedSuffixes.includes(expression.key.value)) {
            throw new CompileError(`'${expression.key.value}' is not a valid ${prefixInfo.valueDescription} for ${expression.base.value}`, expression.key);
        }

        return this.derived(expression.key, { value: `${prefixInfo.prefix}${expression.key.value}` });
    }
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    private visitor: PrefixResolver;

    constructor(sourceMap: SourceMap) {
        super(sourceMap);
        this.visitor = new PrefixResolver(sourceMap);
    }

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | undefined {
        const setting = this.visitor.visitSettingId(statement.setting);
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        if (setting !== statement.setting || value !== statement.value || condition !== statement.condition) {
            return this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
        }
    }

    onSettingShift(statement: Before.SettingShift): After.SettingShift | undefined {
        const condition = statement.condition && this.visitor.visit(statement.condition);

        if (condition !== statement.condition) {
            return this.derived(statement, { condition }) as After.SettingShift;
        }
    }

    onConditionPush(statement: Before.ConditionPush): After.ConditionPush | undefined {
        const condition = this.visitor.visit(statement.condition);

        if (condition !== statement.condition) {
            return this.derived(statement, { condition }) as After.ConditionPush;
        }
    }
}

export function resolvePrefixes(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
