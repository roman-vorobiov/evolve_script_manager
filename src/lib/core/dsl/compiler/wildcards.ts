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
            values: Object.keys(prefixInfo.allowedSuffixes).map(suffix => this.deriveLocation(expression, { type: "Identifier", value: suffix }))
        });
    }
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    private visitor: WildcardResolver;

    constructor(sourceMap: SourceMap, errors: CompileError[]) {
        super(sourceMap, errors);
        this.visitor = new WildcardResolver(sourceMap);
    }

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment {
        const setting = this.visitor.visit(statement.setting);
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        return this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
    }

    onSettingShift(statement: Before.SettingShift): After.SettingShift {
        const condition = statement.condition && this.visitor.visit(statement.condition);

        return this.derived(statement, { condition }) as After.SettingShift;
    }

    onConditionBlock(statement: Before.ConditionBlock, body: After.Statement[]): After.ConditionBlock {
        const condition = this.visitor.visit(statement.condition);

        return this.derived(statement, { condition, body }) as After.ConditionBlock;
    }
}

export function resolveWildcards(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
