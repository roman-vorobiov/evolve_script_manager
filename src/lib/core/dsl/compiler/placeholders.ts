import { CompileError } from "../model";
import { ExpressionVisitor, StatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/3";
import type * as After from "../model/4";

type ReferenceGetter = (placeholder: Before.Symbol) => After.Subscript["key"];

function throwOnPlaceholder(placeholder: Before.Symbol): never {
    throw new CompileError("Placeholder used without the context to resolve it", placeholder);
}

function makeReferenceGetter(node: Before.Identifier | Before.Subscript): ReferenceGetter {
    if (node.type === "Subscript") {
        if (node.key.type === "Placeholder") {
            throwOnPlaceholder(node.key);
        }

        return () => node.key as After.Subscript["key"];
    }

    return throwOnPlaceholder;
}

export class PlaceholderResolver extends ExpressionVisitor {
    constructor(sourceMap: SourceMap, private getter: ReferenceGetter = throwOnPlaceholder) {
        super(sourceMap);
    }

    onPlaceholder(node: Before.Symbol): After.Subscript["key"] {
        return this.getter(node);
    }
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | undefined {
        const getter = makeReferenceGetter(statement.setting);
        const visitor = new PlaceholderResolver(this.sourceMap, getter);

        const value = visitor.visit(statement.value);
        const condition = statement.condition && visitor.visit(statement.condition);

        if (value !== statement.value || condition !== statement.condition) {
            return this.derived(statement, { value, condition }) as After.SettingAssignment;
        }
    }

    onSettingShift(statement: Before.SettingShift): undefined {
        if (statement.condition !== undefined) {
            const visitor = new PlaceholderResolver(this.sourceMap, throwOnPlaceholder);
            visitor.visit(statement.condition);
        }
    }

    onConditionPush(statement: Before.ConditionPush): undefined {
        const visitor = new PlaceholderResolver(this.sourceMap, throwOnPlaceholder);
        visitor.visit(statement.condition);
    }
}

export function resolvePlaceholders(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
