import { CompileError, CompileWarning } from "../model";
import { ExpressionVisitor, GeneratingStatementVisitor } from "./utils";
import { PlaceholderResolver } from "./placeholders";
import { shallowClone } from "$lib/core/utils";

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

    visitSubscript(expression: Before.Subscript): After.Expression {
        const key = this.visit(expression.key, expression);
        if (key !== expression.key) {
            validateType(key, expression.key, "Identifier", "Subscript", "List");
        }

        const base = this.visit(expression.base, expression) as After.Expression | Before.ExpressionDefinition;
        if (base.type === "ExpressionDefinition") {
            if (!base.parameterized) {
                throw new CompileError("Identifier expected", expression.base);
            }

            const instance = this.instantiate(base.body, key as After.Subscript["key"]);
            return this.deriveLocation(expression, instance);
        }
        else {
            if (base !== expression.base) {
                validateType(base, expression.base, "Identifier");
            }

            return this.derived(expression, { base, key }) as After.Subscript;
        }
    }

    onIdentifier(expression: Before.Identifier, parent?: Before.Expression): After.Expression | Before.ExpressionDefinition | undefined {
        if (expression.value.startsWith("$")) {
            const replacement = this.scope[expression.value.slice(1)];
            if (replacement === undefined) {
                throw new CompileError(`'${expression.value.slice(1)}' is not defined`, expression);
            }

            if (!replacement.parameterized) {
                return this.deriveLocation(expression, replacement.body);
            }

            if (!(parent?.type === "Subscript" && parent.base === expression)) {
                throw new CompileError(`Missing arguments for '${replacement.name.value}'`, expression);
            }

            return replacement;
        }
    }

    private instantiate(prototype: Before.Expression, arg: Before.Subscript["key"]): After.Expression {
        if (arg.type === "List") {
            return {
                type: "List",
                fold: arg.fold,
                values: arg.values.map(v => this.instantiate(prototype, v as Before.Subscript["key"]))
            };
        }
        else if (arg.type === "Wildcard") {
            throw new CompileError("Wildcards are only supported for setting prefixes", arg);
        }
        else {
            const parameterResolver = new PlaceholderResolver(this.sourceMap, () => arg);
            return parameterResolver.visit(prototype);
        }
    }
}

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private scope: ScopeDefinitions[] = [{}];

    constructor(sourceMap: SourceMap, errors: CompileError[], private warnings: CompileWarning[]) {
        super(sourceMap, errors);
    }

    private validateDefinition(statement: Before.ExpressionDefinition) {
        if (statement.parameterized) {
            let numberOfPlaceholders = 0;
            const validator = new PlaceholderResolver(this.sourceMap, (node) => {
                ++numberOfPlaceholders;
                return node;
            });
            validator.visit(statement.body);

            if (numberOfPlaceholders === 0) {
                throw new CompileError("Definition is parameterized but no placeholders were found inside the body", statement);
            }
        }
        else {
            const validator = new PlaceholderResolver(this.sourceMap);
            validator.visit(statement.body);
        }
    }

    *onExpressionDefinition(statement: Before.ExpressionDefinition): IterableIterator<never> {
        if (statement.name.value in this.currentScope) {
            this.warnings.push(new CompileWarning(`Redefinition of '${statement.name.value}'`, statement, [
                ["Previously defined here", this.currentScope[statement.name.value]]
            ]));
        }

        this.validateDefinition(statement);

        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);
        const body = visitor.visit(statement.body);

        const definition = body !== statement.body ? this.derived(statement, { body }) : statement;
        this.currentScope[statement.name.value] = definition;
    }

    *visitConditionBlock(statement: Before.ConditionBlock): IterableIterator<After.Statement> {
        this.scope.push(shallowClone(this.currentScope));

        try {
            yield* super.visitConditionBlock(statement);
        }
        finally {
            this.scope.pop();
        }
    }

    *onConditionBlock(statement: Before.ConditionBlock, body: After.Statement[]): IterableIterator<After.ConditionBlock> {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);
        const condition = visitor.visit(statement.condition);

        yield this.derived(statement, { condition, body }) as After.ConditionBlock;
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        const setting = visitor.visit(statement.setting);
        const value = visitor.visit(statement.value);
        const condition = statement.condition && visitor.visit(statement.condition);

        validateType(setting, statement.setting, "Identifier", "Subscript");

        yield this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        const setting = visitor.visit(statement.setting);
        const value = visitor.visit(statement.value);
        const condition = statement.condition && visitor.visit(statement.condition);

        validateType(setting, statement.setting, "Identifier");

        yield this.derived(statement, { setting, value, condition }) as After.SettingShift;
    }

    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        const condition = this.processTriggerArgument(statement.condition);
        const actions = statement.actions.map(a => this.processTriggerArgument(a));

        yield this.derived(statement, { condition, actions }) as After.Trigger;
    }

    private processTriggerArgument(arg: Before.TriggerArgument): After.TriggerArgument {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        const id = visitor.visit(arg.id);
        const count = arg.count && visitor.visit(arg.count);

        validateType(id, arg.id, "Identifier");
        count && validateType(count, arg.count, "Number");

        return this.derived(arg, { id, count }) as After.TriggerArgument;
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
