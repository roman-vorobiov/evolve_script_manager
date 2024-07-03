import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/6";
import type * as After from "../model/7";

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private stack: After.Expression[] = [];

    *visitConditionBlock(statement: Before.ConditionBlock): IterableIterator<After.Statement> {
        const newCondition = this.conjunction(this.scopeCondition(), statement.condition)!;
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
        const parentCondition = this.scopeCondition();

        yield this.derived(statement, {
            condition: this.conjunction(parentCondition, statement.condition)!
        });
    }

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        const parentCondition = this.scopeCondition();

        yield this.derived(statement, {
            condition: this.conjunction(parentCondition, statement.condition)!
        });
    }

    *onSettingShiftBlock(statement: Before.SettingShiftBlock, body: After.Statement[]): IterableIterator<After.Statement> {
        if (this.scopeCondition() !== undefined) {
            throw new CompileError("Evolution queue cannot be set conditionally", statement);
        }

        yield* super.onSettingShiftBlock(statement, body);
    }

    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        yield this.derived(statement, {
            condition: this.scopeCondition()
        });
    }

    private scopeCondition() {
        return this.stack.at(-1);
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
