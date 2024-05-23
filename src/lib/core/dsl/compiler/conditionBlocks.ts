import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/6";
import type * as After from "../model/7";

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private stack: After.Expression[] = [];

    *onConditionPush(statement: Before.ConditionPush): IterableIterator<After.Statement> {
        const newCondition = this.conjunction(this.stack.at(-1), statement.condition)!;
        this.stack.push(newCondition);
    }

    *onConditionPop(statement: Before.ConditionPop): IterableIterator<After.Statement> {
        this.stack.pop();
    }

    *onSettingAssignment(statement: Before.SettingAssignment): IterableIterator<After.SettingAssignment> {
        const parentCondition = this.stack.at(-1);
        if (parentCondition !== undefined) {
            yield this.derived(statement, {
                condition: this.conjunction(parentCondition, statement.condition)!
            });
        }
        else {
            yield statement;
        }
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const parentCondition = this.stack.at(-1);
        if (parentCondition !== undefined) {
            yield this.derived(statement, {
                condition: this.conjunction(parentCondition, statement.condition)!
            });
        }
        else {
            yield statement;
        }
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

export function applyConditionBlocks(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
