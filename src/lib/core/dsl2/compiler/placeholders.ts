import { ParseError } from "../model";
import { ExpressionVisitor, StatementVisitor } from "./utils";

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
            return () => node.key as After.Identifier;
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

export class PlaceholderResolver extends ExpressionVisitor {
    constructor(sourceMap: SourceMap, private getter: ReferenceGetter) {
        super(sourceMap);
    }

    onPlaceholder(node: Before.Symbol): After.Identifier {
        return this.getter(node);
    }
}

class Impl extends StatementVisitor<Before.Statement, After.Statement> {
    constructor(sourceMap: SourceMap) {
        super(sourceMap);
    }

    onSettingAssignment(statement: Before.SettingAssignment): After.SettingAssignment | undefined {
        const getter = makeReferenceGetter(statement.setting);
        const visitor = new PlaceholderResolver(this.sourceMap, getter);

        const value = visitor.visit(statement.value);
        const condition = statement.condition && visitor.visit(statement.condition);

        if (value !== statement.value || condition !== statement.condition) {
            return this.derived(statement, { value, condition }) as After.SettingAssignment;
        }
    }

    onConditionPush(statement: Before.ConditionPush): After.ConditionPush | undefined {
        const visitor = new PlaceholderResolver(this.sourceMap, throwOnPlaceholder);

        const condition = visitor.visit(statement.condition);

        if (condition !== statement.condition) {
            return this.derived(statement, { condition }) as After.ConditionPush;
        }
    }
}

export function resolvePlaceholders(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
