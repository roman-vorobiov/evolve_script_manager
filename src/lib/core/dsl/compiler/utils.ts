import { assert } from "$lib/core/utils/typeUtils";
import { settingType, prefixes } from "$lib/core/domain/settings";
import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { CompileError } from "../model";

import type { Modify } from "$lib/core/utils/typeUtils";
import type { SourceMap } from "../parser/source";
import type { Initial as Parser } from "../model";

export function isConstant(expression: Parser.Expression): expression is Parser.Constant {
    return expression.type === "Boolean" || expression.type === "Number" || expression.type === "String";
}

export function differentLists<BeforeT, AfterT extends BeforeT>(l: AfterT[], r: BeforeT[]): boolean {
    return l.some((value, i) => value !== r[i]);
}

function isBooleanOperator(operator: string) {
    return !["+", "-", "*", "/"].includes(operator);
}

function getSettingType(setting: Parser.Expression): string {
    if (setting.type === "Identifier") {
        const type = settingType(setting.value);
        if (type === undefined) {
            throw new CompileError("Invalid setting", setting);
        }
        return type;
    }
    else if (setting.type === "Subscript") {
        const prefixInfo = prefixes[setting.base.value];
        if (prefixInfo === undefined) {
            throw new CompileError("Invalid setting", setting.base);
        }
        return prefixInfo.type;
    }

    return "unknown";
}

function getCommonListType(settings: Parser.List, getter: (_: Parser.Expression) => string): string {
    const types = new Set(settings.values.map(getter));
    if (types.size !== 1) {
        throw new CompileError("Only settings of the same type are allowed to be in the same list", settings);
    }

    return types.values().next().value;
}

function expressionValueType(expression: Parser.Expression, arg?: Parser.Subscript["key"]): string {
    if (expression.type === "Identifier") {
        const expressionInfo = expressions[expression.value] ?? otherExpressions[expression.value];
        if (expressionInfo === undefined) {
            return "unknown";
        }
        else if (expressionInfo.type !== null) {
            return expressionInfo.type;
        }
        else if (arg !== undefined) {
            if (arg.type === "List") {
                return getCommonListType(arg, getSettingType);
            }
            else if (arg.type === "Identifier" || arg.type === "Subscript") {
                return getSettingType(arg);
            }
        }
    }
    else if (expression.type === "Subscript") {
        return expressionValueType(expression.base, expression.key);
    }
    else if (expression.type === "Expression") {
        return isBooleanOperator(expression.operator) ? "boolean" : "number";
    }
    else if (expression.type === "List") {
        return getCommonListType(expression, expressionValueType);
    }
    else if (expression.type === "Boolean") {
        return "boolean";
    }
    else if (expression.type === "Number") {
        return "number";
    }
    else if (expression.type === "String") {
        return "string";
    }

    return "unknown";
}

export function isBooleanExpression(expression: Parser.Expression, arg?: Parser.Subscript["key"]): boolean {
    return expressionValueType(expression, arg) === "boolean";
}

type ModelEntity = {
    type: string
}

abstract class BaseVisitor {
    constructor(protected sourceMap: SourceMap) {}

    protected deriveLocation<T1 extends object, T2 extends object>(original: T1, node: T2): T2 {
        this.sourceMap.deriveLocation(original, node);
        return node;
    }

    protected derived<T1 extends object, T2 extends object>(original: T1, overrides: T2): Modify<T1, T2> {
        const difference = Object.entries(overrides).filter(([key, value]) => {
            if (!(key in original)) {
                return value !== undefined;
            }
            else if (Array.isArray(value)) {
                return differentLists(value, original[key as keyof T1] as any);
            }
            else {
                return value !== original[key as keyof T1];
            }
        });

        if (difference.length !== 0) {
            return this.deriveLocation(original, { ...original, ...Object.fromEntries(difference) }) as any;
        }
        else {
            return original as any;
        }
    }
}

export abstract class ExpressionVisitor extends BaseVisitor {
    visit(expression: Parser.Expression | Parser.Symbol, parent?: Parser.Expression): Parser.Expression {
        if (expression.type === "Expression") {
            return this.visitExpression(expression as Parser.CompoundExpression, parent);
        }
        else if (expression.type === "List") {
            return this.visitList(expression as Parser.List, parent);
        }
        else if (expression.type === "Subscript") {
            return this.visitSubscript(expression as Parser.Subscript, parent);
        }

        return (this as any)[`on${expression.type}`]?.(expression, parent) ?? expression;
    }

    private visitAll(expressions: Parser.Expression[], parent?: Parser.Expression): Parser.Expression[] {
        const values = expressions.map(value => this.visit(value, parent));
        return differentLists(values, expressions) ? values : expressions;
    }

    protected visitExpression(expression: Parser.CompoundExpression, parent?: Parser.Expression): Parser.Expression {
        const args = this.visitAll(expression.args, expression);
        return this.onExpression(expression, args, parent) ?? expression;
    }

    protected visitList(expression: Parser.List, parent?: Parser.Expression): Parser.Expression {
        const values = this.visitAll(expression.values, expression);
        return this.onList(expression, values, parent) ?? expression;
    }

    protected visitSubscript(expression: Parser.Subscript, parent?: Parser.Expression): Parser.Expression {
        const key = this.visit(expression.key, expression) as Parser.Subscript["key"];
        return this.onSubscript(expression, key, parent) ?? expression;
    }

    protected onExpression(expression: Parser.CompoundExpression, args: Parser.CompoundExpression["args"], parent?: Parser.Expression): Parser.Expression | undefined {
        return this.derived(expression, { args });
    }

    protected onList(expression: Parser.List, values: Parser.List["values"], parent?: Parser.Expression): Parser.Expression | undefined {
        return this.derived(expression, { values });
    }

    protected onSubscript(expression: Parser.Subscript, key: Parser.Subscript["key"], parent?: Parser.Expression): Parser.Expression | undefined {
        return this.derived(expression, { key });
    }
}

abstract class BaseStatementVisitor extends BaseVisitor {
    private errors: CompileError[];

    constructor(sourceMap: SourceMap, errors: CompileError[]) {
        super(sourceMap);
        this.errors = errors;
    }

    protected *guard<T>(iterator: IterableIterator<T>): IterableIterator<T> {
        try {
            yield* iterator;
        }
        catch (e) {
            if (e instanceof CompileError) {
                this.errors.push(e);
            }
            else {
                throw e;
            }
        }
    }

    protected *asGenerator<T>(fn: () => T): IterableIterator<T> {
        yield fn();
    }
}

export abstract class StatementVisitor<BeforeT extends ModelEntity, AfterT extends ModelEntity = BeforeT> extends BaseStatementVisitor {
    visitAll(statements: BeforeT[]): AfterT[] {
        function* generate(self: StatementVisitor<BeforeT, AfterT>) {
            for (const statement of statements) {
                yield* self.guard(self.asGenerator(() => self.visit(statement)));
            }
        }

        return [...generate(this)];
    }

    visit(statement: BeforeT): AfterT {
        if (statement.type === "ConditionBlock") {
            return this.visitConditionBlock(statement as unknown as Parser.ConditionBlock);
        }

        return (this as any)[`on${statement.type}`]?.(statement) ?? statement;
    }

    visitConditionBlock(statement: Parser.ConditionBlock): AfterT {
        const body = this.visitAll(statement.body as any);
        return this.onConditionBlock(statement, body as any) ?? statement as unknown as AfterT;
    }

    onConditionBlock(statement: Parser.ConditionBlock, body: Parser.ConditionBlock["body"]): AfterT | undefined {
        if (differentLists(body, statement.body)) {
            return this.derived(statement, { body }) as unknown as AfterT;
        }
    }
}

export abstract class GeneratingStatementVisitor<BeforeT extends ModelEntity, AfterT extends ModelEntity = BeforeT> extends BaseStatementVisitor {
    visitAll(statements: BeforeT[]): AfterT[] {
        function* generate(self: GeneratingStatementVisitor<BeforeT, AfterT>) {
            for (const statement of statements) {
                yield* self.guard(self.visit(statement));
            }
        }

        return [...generate(this)];
    }

    *visit(statement: BeforeT): IterableIterator<AfterT> {
        if (statement.type === "ConditionBlock") {
            yield* this.visitConditionBlock(statement as unknown as Parser.ConditionBlock);
        }
        else {
            const iterator = (this as any)[`on${statement.type}`]?.(statement);
            if (iterator !== undefined) {
                yield* iterator;
            }
            else {
                assert<AfterT>(statement);
                yield statement;
            }
        }
    }

    *visitConditionBlock(statement: Parser.ConditionBlock): IterableIterator<AfterT> {
        const body = this.visitAll(statement.body as any);
        yield* this.onConditionBlock(statement, body as any);
    }

    *onConditionBlock(statement: Parser.ConditionBlock, body: Parser.ConditionBlock["body"]): IterableIterator<AfterT> {
        if (differentLists(body, statement.body)) {
            yield this.derived(statement, { body }) as unknown as AfterT;
        }
        else {
            yield statement as unknown as AfterT;
        }
    }
}
