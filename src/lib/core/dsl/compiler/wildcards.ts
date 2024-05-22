import { prefixes } from "$lib/core/domain/settings";
import { CompileError } from "../model";
import { ExpressionVisitor, StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/1";
import type * as After from "../model/2";

export class WildcardResolver extends ExpressionVisitor {
    onWildcard(expression: Before.Symbol, parent: Before.Subscript): After.List {
        const prefixInfo = prefixes[parent.base.value];
        if (prefixInfo === undefined) {
            throw new CompileError("Wildcards are only supported for setting prefixes", expression);
        }

        return this.deriveLocation(expression, {
            type: "List",
            values: prefixInfo.allowedSuffixes.map(suffix => this.deriveLocation(expression, { type: "Identifier", value: suffix }))
        });
    }
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    private visitor: WildcardResolver;

    constructor(sourceMap: SourceMap) {
        super(sourceMap);
        this.visitor = new WildcardResolver(sourceMap);
    }

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | undefined {
        const setting = this.visitor.visit(statement.setting);
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        if (setting !== statement.setting || value !== statement.value || condition !== statement.condition) {
            return this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
        }
    }

    onConditionPush(statement: Before.ConditionPush): After.ConditionPush | undefined {
        const condition = this.visitor.visit(statement.condition);

        if (condition !== statement.condition) {
            return this.derived(statement, { condition }) as After.ConditionPush;
        }
    }
}

export function resolveWildcards(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
