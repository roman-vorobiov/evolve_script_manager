import { GeneratingStatementVisitor } from "./utils";

import type { CompileError } from "../model";
import type { SourceMap } from "../parser/source";
import type * as Before from "../model/6";
import type * as After from "../model/7";

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private stack: After.Expression[] = [];

    *visitConditionBlock(statement: Before.ConditionBlock): IterableIterator<After.Statement> {
        const newCondition = this.conjunction(this.stack.at(-1), statement.condition)!;
        this.stack.push(newCondition);

        try {
            for (const childStatement of statement.body) {
                yield* this.visit(childStatement);
            }
        }
        finally {
            this.stack.pop();
        }
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const parentCondition = this.stack.at(-1);

        yield this.derived(statement, {
            condition: this.conjunction(parentCondition, statement.condition)!
        });
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const parentCondition = this.stack.at(-1);

        yield this.derived(statement, {
            condition: this.conjunction(parentCondition, statement.condition)!
        });
    }

    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        yield this.derived(statement, {
            condition: this.stack.at(-1)
        });
    }

    private conjunction(parent?: After.Expression, child?: After.Expression): After.Expression | undefined {
        if (parent === undefined) {
            return child;
        }

        if (child === undefined) {
            return parent;
        }

        return this.deriveLocation(child, <After.CompoundExpression> {
            type: "Expression",
            operator: "and",
            args: [parent, child]
        });
    }
};

export function applyConditionBlocks(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
