import { toSimpleExpression, toEvalExpression } from "./conditions";
import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/9";
import type * as After from "../model/10";

const chainCondition = {
    type: { type: "Identifier", value: "chain" },
    id: { type: "Identifier", value: "" },
    count: { type: "Number", value: 0 }
};

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        if (statement.actions.length === 0) {
            return;
        }

        const iterator = statement.actions.values();

        yield this.deriveLocation(statement, <After.Trigger> {
            type: "Trigger",
            requirement: this.normalizeCondition(statement.condition),
            action: this.normalizeAction(iterator.next().value),
            condition: statement.condition
        });

        for (const tail of iterator) {
            const makeChain = () => {
                return this.deriveLocation(statement, <After.Trigger> {
                    type: "Trigger",
                    requirement: chainCondition,
                    action: this.normalizeAction(tail),
                    condition: statement.condition
                });
            };

            yield* this.guard(this.asGenerator(makeChain));
        }
    }

    private normalizeCondition(condition: Before.Expression | undefined): After.TriggerArgument {
        function fromSimpleExpression(expression: Before.SimpleExpression, count: number): After.TriggerArgument {
            if (expression.type === "Subscript") {
                return {
                    type: expression.base,
                    id: expression.key,
                    count: { type: "Number", value: count }
                };
            }

            if (expression.type !== "Eval") {
                expression = toEvalExpression(expression);
            }

            return {
                type: { type: "Identifier", value: expression.type },
                id: { type: "Identifier", value: expression.value },
                count: { type: "Number", value: count }
            };
        }

        if (condition === undefined) {
            return {
                type: { type: "Identifier", value: "Boolean" },
                id: { type: "Boolean", value: true },
                count: { type: "Number", value: 1 }
            };
        }
        else if (condition.type === "Expression") {
            if (condition.operator === "not") {
                const arg = toSimpleExpression(condition.args[0]);
                return fromSimpleExpression(arg, 0);
            }
            else if (condition.operator === "==" && condition.args[1].type === "Number") {
                const l = toSimpleExpression(condition.args[0]);
                const r = condition.args[1];
                return fromSimpleExpression(l, r.value);
            }
            else if (condition.operator === "==" && condition.args[0].type === "Number") {
                const l = condition.args[0];
                const r = toSimpleExpression(condition.args[1]);
                return fromSimpleExpression(r, l.value);
            }
            else {
                const expr = toSimpleExpression(condition);
                return fromSimpleExpression(expr, 1);
            }
        }
        else {
            return fromSimpleExpression(condition, 1);
        }
    }

    private normalizeAction(arg: Before.Trigger["actions"][0]): After.TriggerArgument {
        const id = this.resolveAliases(arg);
        const count = this.ensureCount(arg);

        if (id !== arg.id || count !== arg.count) {
            return this.derived(arg, { id, count });
        }
        else {
            return arg as After.TriggerArgument;
        }
    }

    private ensureCount(arg: Before.Trigger["actions"][0]): After.NumberLiteral {
        if (arg.count === undefined) {
            return { type: "Number", value: 1 };
        }

        if (!Number.isInteger(arg.count.value)) {
            throw new CompileError("Expected integer, got float", arg.count);
        }

        return arg.count;
    }

    private resolveAliases(arg: Before.Trigger["actions"][0]): After.Identifier {
        if (arg.type.value === "Arpa") {
            return this.derived(arg.id, { value: `arpa${arg.id.value}` });
        }
        else {
            return arg.id;
        }
    }
};

export function createTriggerChains(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
