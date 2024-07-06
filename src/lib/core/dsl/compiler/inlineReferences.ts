import { CompileError, CompileWarning } from "../model";
import { ExpressionVisitor, GeneratingStatementVisitor } from "./utils";
import { PlaceholderResolver } from "./placeholders";
import { shallowClone } from "$lib/core/utils";
import { sameLocation } from "../parser/source";

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

type FunctionDefinition = Before.StatementDefinition & { scope: ScopeDefinitions };

type ScopeDefinitions = Record<string, (Before.ExpressionDefinition | FunctionDefinition)>;

export class ReferenceInliner extends ExpressionVisitor {
    constructor(sourceMap: SourceMap, private scope: ScopeDefinitions) {
        super(sourceMap);
    }

    onFold(expression: Before.FoldExpression, arg: Before.FoldExpression['arg']): After.Expression {
        validateType(arg, expression.arg, "List");
        return this.derived(expression, { arg: arg as After.List });
    }

    visitSubscript(expression: Before.Subscript): After.Expression {
        const key = this.visit(expression.key, expression);
        if (key !== expression.key) {
            validateType(key, expression.key, "Identifier", "Subscript", "List", "Fold");
        }

        const base = this.visit(expression.base, expression) as After.Expression | Before.ExpressionDefinition;
        if (base.type === "ExpressionDefinition") {
            if (!base.parameterized) {
                throw new CompileError("Identifier expected", expression.base);
            }

            const instance = this.instantiate(base.body, key, expression);
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
            const id = expression.value.slice(1);

            const definition = this.scope[id];
            if (definition === undefined) {
                throw new CompileError(`'${id}' is not defined`, expression);
            }

            if (definition.type === "StatementDefinition") {
                throw new CompileError("Statements cannot appear inside expressions", expression);
            }

            if (!definition.parameterized) {
                return this.deriveLocation(expression, definition.body) as After.Expression;
            }

            if (!(parent?.type === "Subscript" && parent.base === expression)) {
                throw new CompileError(`Missing arguments for '${definition.name.value}'`, expression);
            }

            return definition;
        }
    }

    private instantiate(prototype: Before.Expression, arg: Before.Expression, instantiationSite: Before.Expression): After.Expression {
        if (arg.type === "Fold") {
            if (arg.arg.type === "Identifier") {
                throw new CompileError("List expected, got Identifier", arg.arg);
            }

            return this.deriveLocation(instantiationSite, {
                type: "Fold",
                operator: arg.operator,
                arg: this.derived(arg.arg, {
                    values: arg.arg.values.map(v => this.instantiate(prototype, v, v))
                })
            });
        }
        else {
            const parameterResolver = new PlaceholderResolver(this.sourceMap, () => arg);
            return parameterResolver.visit(prototype) as After.Expression;
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

        const body = this.resolveReferences(statement.body);

        this.currentScope[statement.name.value] = this.derived(statement, { body });
    }

    *onStatementDefinition(statement: Before.StatementDefinition): IterableIterator<never> {
        this.validateUniqueName(statement);
        this.validateFunctionParameters(statement);

        this.currentScope[statement.name.value] = this.derived(statement, { scope: this.currentScope });
    }

    *onFunctionCall(statement: Before.FunctionCall): IterableIterator<After.Statement> {
        const definition = this.findFunctionDefinition(statement);

        const args = this.resolveReferences(statement.args);

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

    *onConditionBlock(statement: Before.ConditionBlock, body: Before.Statement[]): IterableIterator<After.ConditionBlock> {
        const condition = this.resolveReferences(statement.condition);

        yield this.derived(statement, { condition, body }) as After.ConditionBlock;
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const setting = this.resolveReferences(statement.setting);
        const value = this.resolveReferences(statement.value);
        const condition = statement.condition && this.resolveReferences(statement.condition);

        validateType(setting, statement.setting, "Identifier", "Subscript");

        yield this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const setting = this.resolveReferences(statement.setting);
        const value = this.resolveReferences(statement.value);
        const condition = statement.condition && this.resolveReferences(statement.condition);

        let values: After.Identifier[] | After.StringLiteral[];
        if (value.type === "List") {
            value.values.forEach(v => validateType(v, statement.value, "Identifier", "String"));
            values = value.values as After.Identifier[] | After.StringLiteral[];
        }
        else {
            validateType(setting, statement.setting, "Identifier", "String");
            values = [value] as After.Identifier[] | After.StringLiteral[];
        }

        validateType(setting, statement.setting, "Identifier");

        yield this.derived(statement, { setting, values, condition }) as After.SettingShift;
    }

    *onLoop(statement: Before.Loop): IterableIterator<After.Statement> {
        const values = this.resolveReferences(statement.values) as After.List;
        validateType(values, statement.values, "List");

        this.validateUniqueName(statement);

        for (const value of values.values) {
            this.scope.push(shallowClone(this.currentScope));

            this.currentScope[statement.iteratorName.value] = {
                type: "ExpressionDefinition",
                name: statement.iteratorName,
                body: value,
                parameterized: false
            };

            try {
                yield* this.visitAll(statement.body) as After.Statement[];
            }
            finally {
                this.scope.pop();
            }
        }
    }

    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        const requirement = this.processTriggerArgument(statement.requirement);
        const actions = statement.actions.map(a => this.processTriggerArgument(a));

        yield this.derived(statement, { requirement, actions }) as After.Trigger;
    }

    private processTriggerArgument(arg: Before.TriggerArgument): After.TriggerArgument {
        const id = this.resolveReferences(arg.id);
        const count = arg.count && this.resolveReferences(arg.count);

        validateType(id, arg.id, "Identifier");
        if (count !== undefined) {
            validateType(count, arg.count, "Number");
        }

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

    private validateFunctionParameters(statement: Before.StatementDefinition) {
        const uniqueNames = new Set<string>();
        for (const param of statement.params) {
            if (uniqueNames.has(param.value)) {
                throw new CompileError(`Duplicate identifier '${param.value}'`, param);
            }

            uniqueNames.add(param.value);
        }
    }

    private validateUniqueName(statement: Before.ExpressionDefinition | Before.StatementDefinition | Before.Loop) {
        const id = statement.type === "Loop" ? statement.iteratorName : statement.name;

        const previousDefinition = this.currentScope[id.value];

        // Allow the same definition to be imported multiple times
        const previousLocation = this.sourceMap.findLocation(previousDefinition);
        const thisLocation = this.sourceMap.findLocation(statement);
        const sameDefinition = previousLocation && thisLocation && sameLocation(previousLocation, thisLocation);

        if (previousDefinition !== undefined && !sameDefinition) {
            this.warnings.push(new CompileWarning(`Redefinition of '${id.value}'`, id, [
                ["Previously defined here", previousDefinition]
            ]));
        }
    }

    private findFunctionDefinition(statement: Before.FunctionCall): FunctionDefinition {
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

        return definition;
    }

    private resolveReferences(expression: Before.Expression): After.Expression;
    private resolveReferences(expression: Before.Expression[]): After.Expression[];
    private resolveReferences(expression: Before.Expression | Before.Expression[]): After.Expression | Before.Expression[] {
        const visitor = new ReferenceInliner(this.sourceMap, this.currentScope);

        if (Array.isArray(expression)) {
            return visitor.visitAll(expression);
        }
        else {
            return visitor.visit(expression) as After.Expression;
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
