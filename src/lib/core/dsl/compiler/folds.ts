import { assume } from "$lib/core/utils/typeUtils";
import { CompileError } from "../model";
import { ExpressionVisitor, GeneratingStatementVisitor, differentLists, isBooleanExpression } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/2";
import type * as After from "../model/3";

function validateExpressionResolved(expression: any): asserts expression is After.Expression {
    if (expression.type === "List") {
        throw new CompileError("Fold expression detected outside of a boolean expression", expression);
    }
}

export class FoldResolver extends ExpressionVisitor {
    onList(expression: Before.List, values: Before.List["values"]): Before.Expression {
        // Throw on nested lists
        if (values.some(value => value.type === "List")) {
            throw new CompileError("Only one fold subexpression is allowed", expression);
        }

        const node = this.derived(expression, { values });

        return this.foldIfNeeded(node, expression, isBooleanExpression(expression));
    }

    onSubscript(expression: Before.Subscript, key: Before.Subscript["key"]): Before.Expression | undefined {
        if (key.type === "List") {
            // Transform each element as the subscript of `expression.base`
            const node = this.derived(key, {
                values: key.values.map(value => this.derived(expression, <After.Subscript> { key: value }))
            });

            if (expression.explicitKeyFold !== undefined) {
                node.fold = expression.explicitKeyFold;
            }

            // If the base is a boolean setting prefix or condition expression, fold the list
            return this.foldIfNeeded(node, expression, isBooleanExpression(expression.base, key));
        }
    }

    onExpression(expression: Before.CompoundExpression, args: Before.CompoundExpression["args"]): Before.Expression {
        const numberOfFolds = args.filter(arg => arg.type === "List").length;

        if (numberOfFolds > 1) {
            // Instead of engaging in arbitrary combinatorics, just reject such cases
            throw new CompileError("Only one fold subexpression is allowed", expression);
        }
        else if (numberOfFolds === 0) {
            return this.derived(expression, { args });
        }
        else if (args.length === 1) {
            // This means the argument of 'not' is not boolean, but it's not this component's job to guard against that
            return this.derived(expression, { args: [this.foldLeft(args[0] as Before.List, expression)] });
        }
        else {
            let node: Before.List;
            if (args[0].type === "List") {
                // foo[a, b] / 2 -> [foo.a / 2, foo.b / 2]
                node = this.derived(args[0], {
                    values: args[0].values.map(arg => this.derived(expression, { args: [arg, args[1]] }))
                });
            }
            else {
                assume(args[1].type === "List");
                // 2 / foo[a, b] -> [2 / foo.a, 2 / foo.b]
                node = this.derived(args[1], {
                    values: args[1].values.map(arg => this.derived(expression, { args: [args[0], arg] }))
                });
            }

            return this.foldIfNeeded(node, expression, isBooleanExpression(expression));
        }
    }

    visitSettingId(expression: Before.Identifier | Before.Subscript): Before.SettingAssignment["setting"] | Before.List {
        if (expression.type === "Identifier") {
            return expression;
        }

        if (expression.key.type === "List" && expression.key.fold === "or") {
            throw new CompileError("Disjunction is not allowed in setting targets", expression.key);
        }

        return this.visit(expression) as Before.SettingAssignment["setting"] | Before.List;
    }

    private foldIfNeeded(expresson: Before.List, originalNode: Before.Expression, condition: boolean) {
        if (condition) {
            return this.foldLeft(expresson, originalNode);
        }
        else {
            return this.deriveLocation(originalNode, expresson);
        }
    }

    private foldLeft(expresson: Before.List, originalNode: Before.Expression): After.Expression {
        if (expresson.fold === undefined) {
            throw new CompileError("Ambiguous fold expression: use 'and' or 'or' instead of the last comma or use 'any of' or 'all of' before the list", expresson);
        }

        return expresson.values.reduce((l, r) => {
            return this.deriveLocation(originalNode, <After.Expression> {
                type: "Expression",
                operator: expresson.fold,
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
