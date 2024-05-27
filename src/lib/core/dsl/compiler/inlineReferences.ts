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

type ScopeDefinitions = Record<string, (Before.ExpressionDefinition | Before.StatementDefinition & { scope: ScopeDefinitions })>;

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

            const instance = this.instantiate(base.body, key as After.Subscript["key"], expression.explicitKeyFold);
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
            const definition = this.scope[expression.value.slice(1)];
            if (definition === undefined) {
                throw new CompileError(`'${expression.value.slice(1)}' is not defined`, expression);
            }

            if (definition.type === "StatementDefinition") {
                throw new CompileError("Statements cannot appear inside expressions", expression);
            }

            if (!definition.parameterized) {
                return this.deriveLocation(expression, definition.body);
            }

            if (!(parent?.type === "Subscript" && parent.base === expression)) {
                throw new CompileError(`Missing arguments for '${definition.name.value}'`, expression);
            }

            return definition;
        }
    }

    private instantiate(prototype: Before.Expression, arg: Before.Subscript["key"], explicitFold?: "and" | "or"): After.Expression {
        if (arg.type === "List") {
            return {
                type: "List",
                fold: explicitFold ?? arg.fold,
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
    private scope: ScopeDefinitions[];

    constructor(
        sourceMap: SourceMap,
        errors: CompileError[],
        private warnings: CompileWarning[],
        parentScope: ScopeDefinitions = {},
        private callStack: string[] = []
    ) {
        super(sourceMap, errors);
        this.scope = [parentScope];
    }

    *onExpressionDefinition(statement: Before.ExpressionDefinition): IterableIterator<never> {
        this.validateUniqueName(statement);
        this.validateExpressionParameters(statement);

        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);
        const body = visitor.visit(statement.body);

        this.currentScope[statement.name.value] = this.derived(statement, { body });
    }

    *onStatementDefinition(statement: Before.StatementDefinition): IterableIterator<never> {
        this.validateUniqueName(statement);

        this.currentScope[statement.name.value] = { ...statement, scope: this.currentScope };
    }

    *onFunctionCall(statement: Before.FunctionCall): IterableIterator<After.Statement> {
        if (!statement.name.value.startsWith("$")) {
            throw new CompileError(`Unknown identifier '${statement.name.value}'`, statement.name);
        }

        const id = statement.name.value.slice(1);

        if (this.callStack.includes(id)) {
            throw new CompileError("Recursion is not allowed", statement);
        }

        const definition = this.currentScope[id];
        if (definition === undefined) {
            throw new CompileError(`'${id}' is not defined`, statement.name);
        }

        if (definition.type === "ExpressionDefinition") {
            throw new CompileError("Expressions cannot appear outside of a statement", statement);
        }

        if (definition.params.length !== statement.args.length) {
            throw new CompileError(`Expected ${definition.params.length} arguments, got ${statement.args.length}`, statement);
        }

        const expressionVisitor = new ReferenceInliner(this.sourceMap, this.currentScope);
        const args = statement.args.map(arg => expressionVisitor.visit(arg));

        const callStack = [...this.callStack, definition.name.value]

        const functionScope = shallowClone(definition.scope);
        for (let i = 0; i != args.length; ++i) {
            functionScope[definition.params[i].value] = {
                type: "ExpressionDefinition",
                name: definition.params[i],
                body: args[i],
                parameterized: false
            };
        }

        const statementVisitor = new Impl(this.sourceMap, this.errors, this.warnings, functionScope, callStack);
        yield* statementVisitor.visitAll(definition.body);
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
        const values = visitor.visitAll(statement.values);
        const condition = statement.condition && visitor.visit(statement.condition);

        validateType(setting, statement.setting, "Identifier");

        yield this.derived(statement, { setting, values, condition }) as After.SettingShift;
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

    private validateExpressionParameters(statement: Before.ExpressionDefinition) {
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

    private validateUniqueName(statement: Before.ExpressionDefinition | Before.StatementDefinition) {
        if (statement.name.value in this.currentScope) {
            this.warnings.push(new CompileWarning(`Redefinition of '${statement.name.value}'`, statement, [
                ["Previously defined here", this.currentScope[statement.name.value]]
            ]));
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
