import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model/7";

class Impl extends GeneratingStatementVisitor<Parser.Statement> {
    private ignoredIds: string[] = [];

    *onSettingShift(statement: Parser.SettingShift): IterableIterator<Parser.SettingShift> {
        if (statement.setting.value !== "logFilter") {
            yield statement;
            return;
        }

        if (statement.condition !== undefined) {
            throw new CompileError("Log filter cannot be set conditionally", statement.condition);
        }

        if (statement.value.type !== "String") {
            throw new CompileError("String expected", statement.value);
        }

        if (statement.operator === ">>") {
            const idx = this.ignoredIds.indexOf(statement.value.value);
            if (idx !== -1) {
                this.ignoredIds.splice(idx, 1);
            }
        }
        else {
            this.ignoredIds.push(statement.value.value);
        }
    }

    visitAll(statements: Parser.Statement[]): Parser.Statement[] {
        const result = super.visitAll(statements);

        if (this.ignoredIds.length !== 0) {
            const logFilter = this.ignoredIds.join(", ");

            result.push(<Parser.SettingAssignment> {
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "logFilter" },
                value: { type: "String", value: logFilter }
            });
        }

        return result;
    }
}

export function collectLogFilterStrings(statements: Parser.Statement[], sourceMap: SourceMap): Parser.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
