import { races } from "$lib/core/domain/races";
import { resetTypes } from "$lib/core/domain/enums";
import { prefixes } from "$lib/core/domain/settings";
import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model/7";

export type QueueItem = {
    targetRace: string,
    resetType: string,
    challenges: string[]
}

class Impl extends GeneratingStatementVisitor<Parser.Statement> {
    private queue: QueueItem[] = [];

    *onSettingShift(statement: Parser.SettingShift): IterableIterator<Parser.SettingShift> {
        if (statement.setting.value !== "evolutionQueue") {
            return yield statement;
        }

        if (statement.condition !== undefined) {
            throw new CompileError("Evolution queue cannot be set conditionally", statement.condition);
        }

        if (statement.operator !== "<<") {
            throw new CompileError("Only the push operation is supported for 'evolutionQueue'", statement);
        }

        if (statement.values.length < 1) {
            throw new CompileError("Target race is not specified", statement);
        }

        if (statement.values.length < 2) {
            throw new CompileError("Target reset type is not specified", statement);
        }

        for (const value of statement.values) {
            if (value.type !== "Identifier") {
                throw new CompileError("Identifier expected", value);
            }
        }

        this.queue.push({
            targetRace: this.getTargetRace(statement.values[0] as Parser.Identifier),
            resetType: this.getResetType(statement.values[1] as Parser.Identifier),
            challenges: statement.values.slice(2).map(value => this.getChallenge(value as Parser.Identifier))
        });
    }

    visitAll(statements: Parser.Statement[]): Parser.Statement[] {
        const result = super.visitAll(statements);

        if (this.queue.length !== 0) {
            result.push({
                type: "SettingPush",
                setting: { type: "Identifier", value: "evolutionQueue" },
                values: this.queue
            });
        }

        return result;
    }

    private getTargetRace(value: Parser.Identifier): string {
        if (value.value !== "auto" && !(value.value in races)) {
            throw new CompileError(`Unknown race '${value.value}'`, value);
        }

        return value.value;
    }

    private getResetType(value: Parser.Identifier): string {
        if (!(value.value in resetTypes)) {
            throw new CompileError(`Unknown reset type '${value.value}'`, value);
        }

        return value.value;
    }

    private getChallenge(value: Parser.Identifier): string {
        if (!prefixes.Challenge.allowedSuffixes.includes(value.value)) {
            throw new CompileError(`Unknown challenge '${value.value}'`, value);
        }

        return value.value;
    }
}

export function buildEvolutionQueue(statements: Parser.Statement[], sourceMap: SourceMap, errors: CompileError[]): Parser.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
