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

export function collectLogFilterStrings(statements: Parser.Statement[], sourceMap: SourceMap, errors: CompileError[]): Parser.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
