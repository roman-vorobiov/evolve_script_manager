import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/7";
import type * as After from "../model/8_intermediate";

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private ignoredIds: string[] = [];

    *onSettingShift(statement: Before.SettingShift): IterableIterator<After.SettingShift> {
        if (statement.setting.value !== "logFilter") {
            return yield statement;
        }

        if (statement.condition !== undefined) {
            throw new CompileError("Log filter cannot be set conditionally", statement.condition);
        }

        for (const id of statement.values) {
            if (id.type !== "String") {
                throw new CompileError("String expected", id);
            }

            if (statement.operator === ">>") {
                const idx = this.ignoredIds.indexOf(id.value);
                if (idx !== -1) {
                    this.ignoredIds.splice(idx, 1);
                }
            }
            else {
                this.ignoredIds.push(id.value);
            }
        }
    }

    processStatements(statements: Before.Statement[]): After.Statement[] {
        const result = this.visitAll(statements);

        if (this.ignoredIds.length !== 0) {
            const logFilter = this.ignoredIds.join(", ");

            result.push(<After.SettingAssignment> {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "logFilter" },
                value: { type: "String", value: logFilter }
            });
        }

        return result;
    }
}

export function collectLogFilterStrings(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.processStatements(statements);
}
