import { assert } from "$lib/core/utils/typeUtils";

import type { Modify } from "$lib/core/utils/typeUtils";
import type { SourceMap } from "../parser/source";
import { CompileError, type Initial as Parser } from "../model/index";

export function isConstant(expression: Parser.Expression): expression is Parser.Constant {
    return expression.type === "Boolean" || expression.type === "Number" || expression.type === "String";
}

export function differentLists<BeforeT, AfterT extends BeforeT>(l: AfterT[], r: BeforeT[]): boolean {
    return l.some((value, i) => value !== r[i]);
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
        return this.deriveLocation(original, { ...original, ...overrides });
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
        return this.defaultCallback(expression, args, "args");
    }

    protected onList(expression: Parser.List, values: Parser.List["values"], parent?: Parser.Expression): Parser.Expression | undefined {
        return this.defaultCallback(expression, values, "values");
    }

    protected onSubscript(expression: Parser.Subscript, key: Parser.Subscript["key"], parent?: Parser.Expression): Parser.Expression | undefined {
        return this.defaultCallback(expression, key, "key");
    }

    private defaultCallback<T extends Parser.Expression, U>(expression: T, newValue: U, key: keyof T): Parser.Expression | undefined {
        if (newValue !== expression[key]) {
            return this.derived(expression, { [key]: newValue }) as any as T;
        }
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
        return (this as any)[`on${statement.type}`]?.(statement) ?? statement;
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
