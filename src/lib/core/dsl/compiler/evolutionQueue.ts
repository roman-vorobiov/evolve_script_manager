import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/8_intermediate";
import type * as After from "../model/8";

function makeQueueEntry(statements: Before.SettingAssignment[]): object {
    return Object.fromEntries(statements.map(s => [s.setting.value, (s.value as After.Constant).value]));
}

class Impl extends GeneratingStatementVisitor<Before.Statement, After.Statement> {
    private queue: object[] = [];

    *visitSettingShiftBlock(statement: Before.SettingShiftBlock): IterableIterator<never> {
        if (statement.setting.value !== "evolutionQueue") {
            throw new CompileError("'evolutionQueue' expected", statement.setting);
        }

        let hasEvolutionTarget = false;
        let hasPrestigeType = false;

        for (const child of statement.body) {
            if (child.type !== "SettingAssignment") {
                throw new CompileError("Only setting assignments can appear inside evolution queue body", child);
            }

            if (child.condition !== undefined) {
                throw new CompileError("Evolution queue settings must not have conditions", child.condition);
            }

            if (child.setting.value === "userEvolutionTarget") {
                hasEvolutionTarget = true;
            }

            if (child.setting.value === "prestigeType") {
                hasPrestigeType = true;
            }
        }

        if (!hasEvolutionTarget) {
            throw new CompileError("'userEvolutionTarget' is not specified", statement);
        }

        if (!hasPrestigeType) {
            throw new CompileError("'prestigeType' is not specified", statement);
        }

        this.queue.push(makeQueueEntry(statement.body as Before.SettingAssignment[]));
    }

    processStatements(statements: Before.Statement[]): After.Statement[] {
        const result = this.visitAll(statements);

        if (this.queue.length !== 0) {
            result.push({
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: this.queue
            });
        }

        return result;
    }
}

export function buildEvolutionQueue(statements: Before.Statement[], sourceMap: SourceMap, errors: CompileError[]): After.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.processStatements(statements);
}
