import { settingType, prefixes } from "$lib/core/domain/settings";
import { expressions, otherExpressions } from "$lib/core/domain/expressions";
import { assume } from "$lib/core/utils/typeUtils";
import { CompileError } from "../model";
import { ExpressionVisitor, GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/2";
import type * as After from "../model/3";

function isBooleanOperator(operator: string) {
    return !["+", "-", "*", "/"].includes(operator);
}

function isBooleanExpression(base: Before.Identifier, keys: Before.List): boolean {
    const expressionInfo = expressions[base.value] ?? otherExpressions[base.value];
    if (expressionInfo === undefined) {
        return false;
    }

    const type = expressionInfo.type ?? getCommonSettingsType(keys);

    return type === "boolean";
}

function validateExpressionResolved(expression: any): asserts expression is After.Expression {
    if (expression.type === "List") {
        throw new CompileError("Fold expression detected outside of a boolean expression", expression);
    }
}

function getCommonSettingsType(settings: Before.List): string {
    function getSettingType(setting: Before.Expression): string | undefined {
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
    }

    const types = new Set(settings.values.map(getSettingType));
    if (types.size !== 1) {
        throw new CompileError("Only settings of the same type are allowed to be in the same list", settings);
    }

    return types.values().next().value;
}

export class FoldResolver extends ExpressionVisitor {
    onList(list: Before.List, values: Before.List["values"], parent?: Before.Expression): Before.Expression | undefined {
        // Throw on nested lists
        if (values.some(value => value.type === "List")) {
            throw new CompileError("Only one fold subexpression is allowed", list);
        }

        return super.onList(list, values, parent) as Before.Expression;
    }

    onSubscript(expression: Before.Subscript, key: Before.Subscript["key"]): Before.Expression | undefined {
        if (key.type === "Placeholder") {
            return;
        }

        if (key.type === "List") {
            // Transform each element as the subscript of `expression.base`
            const node = this.derived(key, {
                values: key.values.map(value => this.derived(expression, <After.Subscript> { key: value }))
            });

            // If the base is a boolean setting prefix or condition expression, fold the list
            return isBooleanExpression(expression.base, key) ? this.foldLeft(node) : node;
        }
    }

    onExpression(expression: Before.CompoundExpression, args: Before.CompoundExpression["args"]): Before.Expression | undefined {
        const numberOfFolds = args.filter(arg => arg.type === "List").length;

        if (numberOfFolds > 1) {
            // Instead of engaging in arbitrary combinatorics, just reject such cases
            throw new CompileError("Only one fold subexpression is allowed", expression);
        }
        else if (numberOfFolds === 0) {
            if (args.some((arg, i) => arg !== expression.args[i])) {
                // No folds directly as subexpressions, but some have been found and resolved down the tree
                return this.derived(expression, { args });
            }
        }
        else if (args.length === 1) {
            // This means the argument of 'not' is not boolean, but it's not this component's job to guard against that
            return this.derived(expression, { args: [this.foldLeft(args[0] as Before.List)] });
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

            return isBooleanOperator(expression.operator) ? this.foldLeft(node) : node;
        }
    }

    private foldLeft(expresson: Before.List): After.Expression {
        if (expresson.fold === undefined) {
            throw new CompileError("Ambiguous fold expression: use 'and' or 'or' instead of the last comma", expresson);
        }

        return expresson.values.reduce((l, r) => {
            return this.deriveLocation(expresson, <After.Expression> {
                type: "Expression",
                operator: expresson.fold,
                args: [l, r]
            });
        }) as After.Expression;
    }
}

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private visitor: FoldResolver;

    constructor(sourceMap: SourceMap) {
        super(sourceMap);
        this.visitor = new FoldResolver(sourceMap);
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const setting = this.visitor.visit(statement.setting) as Before.SettingAssignment["setting"] | Before.List;
        const value = this.visitor.visit(statement.value);
        const condition = statement.condition && this.visitor.visit(statement.condition);

        validateExpressionResolved(value);

        if (condition) {
            validateExpressionResolved(condition);
        }

        if (setting.type === "List") {
            if (setting.fold === "or") {
                throw new CompileError("Disjunction is not allowed in setting targets", setting);
            }

            for (const target of setting.values) {
                yield this.derived(statement, { setting: target as After.SettingAssignment["setting"], value, condition });
            }
        }
        else if (setting !== statement.setting || value !== statement.value || condition !== statement.condition) {
            yield this.derived(statement, { setting, value, condition }) as After.SettingAssignment;
        }
        else {
            yield statement as After.SettingAssignment;
        }
    }

    *onConditionPush(statement: Before.ConditionPush): IterableIterator<After.ConditionPush> {
        const condition = this.visitor.visit(statement.condition);

        validateExpressionResolved(condition);

        if (condition !== statement.condition) {
            yield this.derived(statement, { condition }) as After.ConditionPush;
        }
        else {
            yield statement as After.ConditionPush;
        }
    }
}

export function resolveFolds(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
