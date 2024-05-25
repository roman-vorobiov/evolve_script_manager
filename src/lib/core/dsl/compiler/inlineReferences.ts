import { CompileError, CompileWarning } from "../model";
import { ExpressionVisitor, GeneratingStatementVisitor, differentLists } from "./utils";
import { PlaceholderResolver } from "./placeholders"
import { shallowClone } from "$lib/core/utils"

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/0";
import type * as After from "../model/1";

function validateType<T>(node: Before.Expression, reference: T, ...expectedTypes: string[]) {
    if (!expectedTypes.includes(node.type)) {
        let expectation: string;
        if (expectedTypes.length === 1) {
            expectation = expectedTypes[0];
        }
        else {
            expectation = `${expectedTypes.slice(0, -1).join(", ")} or ${expectedTypes.at(-1)}`;
        }

        throw new CompileError(`${expectation} expected, got ${node.type}`, reference);
    }
}

type ScopeDefinitions = Record<string, Before.ExpressionDefinition>;

export class ReferenceInliner extends ExpressionVisitor {
    constructor(sourceMap: SourceMap, private scope: ScopeDefinitions) {
        super(sourceMap);
    }

    visitSubscript(expression: Before.Subscript): After.Subscript {
        const base = this.visit(expression.base, expression);
        const key = this.visit(expression.key, expression);

        if (base === expression.base && key === expression.key) {
            return expression;
        }

        if (base !== expression.base) {
            validateType(base, expression.base, "Identifier");
        }

        if (key !== expression.key) {
            validateType(key, expression.key, "Identifier", "Subscript", "List");
        }

        return this.derived(expression, { base, key }) as After.Subscript;
    }

    onIdentifier(expression: Before.Identifier): After.Expression | undefined {
        if (expression.value.startsWith("$")) {
            const replacement = this.scope[expression.value.slice(1)];
            if (replacement === undefined) {
                throw new CompileError(`'${expression.value.slice(1)}' is not defined`, expression);
            }

            return this.deriveLocation(expression, replacement).body;
        }
    }
}

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private scope: ScopeDefinitions[] = [{}];

    constructor(sourceMap: SourceMap, errors: CompileError[], private warnings: CompileWarning[]) {
        super(sourceMap, errors);
    }

    *onExpressionDefinition(statement: Before.ExpressionDefinition): IterableIterator<never> {
        if (statement.name.value in this.currentScope) {
            this.warnings.push(new CompileWarning(`Redefinition of '${statement.name.value}'`, statement, [
                ["Previously defined here", this.currentScope[statement.name.value]]
            ]));
        }

        const validator = new PlaceholderResolver(this.sourceMap);
        validator.visit(statement.body);

        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);
        const body = visitor.visit(statement.body);

        const definition = body !== statement.body ? this.derived(statement, { body }) : statement;
        this.currentScope[statement.name.value] = definition;
    }

    *onConditionPush(statement: Before.ConditionPush): IterableIterator<After.ConditionPush> {
        this.scope.push(shallowClone(this.currentScope));

        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);
        const condition = visitor.visit(statement.condition);

        if (condition !== statement.condition) {
            yield this.derived(statement, { condition }) as After.ConditionPush;
        }
        else {
            yield statement;
        }
    }

    *onConditionPop(statement: Before.ConditionPop): IterableIterator<After.ConditionPop> {
        this.scope.pop();

        yield statement;
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        const setting = visitor.visit(statement.setting);
        const value = visitor.visit(statement.value);
        const condition = statement.condition && visitor.visit(statement.condition);

        if (setting !== statement.setting || value !== statement.value || condition !== statement.condition) {
            validateType(setting, statement.setting, "Identifier", "Subscript");
            yield this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
        }
        else {
            yield statement;
        }
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        const setting = visitor.visit(statement.setting);
        const value = visitor.visit(statement.value);
        const condition = statement.condition && visitor.visit(statement.condition);

        if (setting !== statement.setting || value !== statement.value || condition !== statement.condition) {
            validateType(setting, statement.setting, "Identifier");
            yield this.derived(statement, { setting, value, condition }) as After.SettingShift;
        }
        else {
            yield statement;
        }
    }

    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        const condition = this.processTriggerArgument(statement.condition);
        const actions = statement.actions.map(a => this.processTriggerArgument(a));

        if (condition !== statement.condition || differentLists(actions, statement.actions)) {
            yield this.derived(statement, { condition, actions }) as After.Trigger;
        }
        else {
            yield statement as After.Trigger;
        }
    }

    private processTriggerArgument(arg: Before.TriggerArgument): After.TriggerArgument {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        const id = visitor.visit(arg.id);
        const count = arg.count && visitor.visit(arg.count);

        if (id !== arg.id || count !== arg.count) {
            validateType(id, arg.id, "Identifier");
            count && validateType(count, arg.count, "Number");

            return this.derived(arg, { id, count }) as After.TriggerArgument;
        }
        else {
            return arg as After.TriggerArgument;
        }
    }

    private get currentScope(): ScopeDefinitions {
        return this.scope.at(-1)!;
    }
}

export function inlineReferences(
    statements: Before.Statement[],
    sourceMap: SourceMap,
    errors: CompileError[],
    warnings: CompileWarning[]
): After.Statement[] {
    const impl = new Impl(sourceMap, errors, warnings);

    return impl.visitAll(statements);
}
