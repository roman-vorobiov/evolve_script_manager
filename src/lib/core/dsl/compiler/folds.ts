import { assume } from "$lib/core/utils/typeUtils";
import { CompileError } from "../model";
import { ExpressionVisitor, GeneratingStatementVisitor, isBooleanExpression } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/2";
import type * as After from "../model/3";

function validateExpressionResolved(expression: any): asserts expression is After.Expression {
    if (expression.type === "Fold") {
        throw new CompileError("Fold expression detected outside of a boolean expression", expression);
    }
}

export class FoldResolver extends ExpressionVisitor {
    private insideList = false;

    visitList(expression: Before.List): Before.List {
        if (this.insideList) {
            throw new CompileError("Nested lists are not supported", expression);
        }

        try {
            this.insideList = true;
            const values = this.visitAll(expression.values, expression) as Before.Expression[];
            return this.derived(expression, { values });
        }
        finally {
            this.insideList = false;
        }
    }

    onFold(expression: Before.FoldExpression, arg: Before.List): Before.Expression {
        const node = this.derived(expression, { arg });
        return this.foldIfNeeded(node, expression, isBooleanExpression(expression));
    }

    onSubscript(expression: Before.Subscript, key: Before.Subscript["key"]): Before.Expression | undefined {
        if (key.type === "List") {
            throw new CompileError("Lists in the subscript must be folded with either 'any of' or 'all of'", expression);
        }
        else if (key.type === "Fold") {
            const node = this.derived(expression, { key });
            const unwrapped = this.unwrap(node) as Before.FoldExpression;
            return this.foldIfNeeded(unwrapped, expression, isBooleanExpression(expression.base, key));
        }
    }

    onExpression(expression: Before.CompoundExpression, args: Before.CompoundExpression["args"]): Before.Expression {
        const numberOfFolds = args.filter(arg => arg.type === "Fold").length;

        if (numberOfFolds > 1) {
            // Instead of engaging in arbitrary combinatorics, just reject such cases
            throw new CompileError("Only one fold subexpression is allowed", expression);
        }
        else if (numberOfFolds === 0) {
            return this.derived(expression, { args });
        }
        else if (args.length === 1) {
            // This means the argument of 'not' is not boolean, but it's not this component's job to guard against that
            return this.derived(expression, { args: [this.foldLeft(args[0] as Before.FoldExpression, expression)] });
        }
        else {
            let node: Before.FoldExpression;
            if (args[0].type === "Fold") {
                // foo[a, b] / 2 -> [foo.a / 2, foo.b / 2]
                node = this.derived(args[0], {
                    arg: this.derived(args[0].arg, {
                        values: args[0].arg.values.map(arg => this.derived(expression, { args: [arg, args[1]] }))
                    })
                });
            }
            else {
                assume(args[1].type === "Fold");
                // 2 / foo[a, b] -> [2 / foo.a, 2 / foo.b]
                node = this.derived(args[1], {
                    arg: this.derived(args[1].arg, {
                        values: args[1].arg.values.map(arg => this.derived(expression, { args: [args[0], arg] }))
                    })
                });
            }

            return this.foldIfNeeded(node, expression, isBooleanExpression(expression));
        }
    }

    visitSettingId(expression: Before.Identifier | Before.Subscript): Before.SettingAssignment["setting"] | Before.List {
        if (expression.type === "Subscript") {
            if (expression.key.type === "Fold") {
                throw new CompileError("Fold expressions are not allowed in setting targets", expression.key);
            }
            else if (expression.key.type === "List") {
                return this.unwrap(expression) as Before.List;
            }
        }

        return expression;
    }

    private unwrap<T extends Before.Subscript>(expression: T): T["key"] {
        assume(expression.key.type === "List" || expression.key.type === "Fold");

        // Transform each element as the subscript of `expression.base`
        if (expression.key.type === "List") {
            return this.derived(expression.key, {
                values: expression.key.values.map(v => this.derived(expression, { key: v }) as After.Subscript)
            });
        }
        else {
            return this.derived(expression.key, {
                arg: this.derived(expression.key.arg, {
                    values: expression.key.arg.values.map(v => this.derived(expression, { key: v }) as After.Subscript)
                })
            });
        }
    }

    private foldIfNeeded(expression: Before.FoldExpression, originalNode: Before.Expression, condition: boolean) {
        if (condition) {
            return this.foldLeft(expression, originalNode);
        }
        else {
            return this.deriveLocation(originalNode, expression);
        }
    }

    private foldLeft(expresson: Before.FoldExpression, originalNode: Before.Expression): After.Expression {
        return expresson.arg.values.reduce((l, r) => {
            return this.deriveLocation(originalNode, <After.Expression> {
                type: "Expression",
                operator: expresson.operator,
                args: [l, r]
            });
        }) as After.Expression;
    }
}

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private visitor: FoldResolver;

    constructor(sourceMap: SourceMap, errors: CompileError[]) {
        super(sourceMap, errors);
        this.visitor = new FoldResolver(sourceMap);
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const setting = this.visitor.visitSettingId(statement.setting);
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        validateExpressionResolved(value);

        if (condition) {
            validateExpressionResolved(condition);
        }

        if (setting.type === "List") {
            for (const target of setting.values) {
                yield this.derived(statement, { setting: target as After.SettingAssignment["setting"], value, condition });
            }
        }
        else {
            yield this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
        }
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const condition = statement.condition && this.visitor.visit(statement.condition);
        if (condition) {
            validateExpressionResolved(condition);
        }

        yield this.derived(statement, { condition });
    }

    *onConditionBlock(statement: Before.ConditionBlock, body: After.Statement[]): IterableIterator<After.ConditionBlock> {
        const condition = this.visitor.visit(statement.condition);

        validateExpressionResolved(condition);

        yield this.derived(statement, { condition, body }) as After.ConditionBlock;
    }
}

export function resolveFolds(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
