import techIds from "$lib/core/domain/tech";
import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model/8_intermediate";

type Entry = {
    tech: string,
    condition?: Parser.Expression
}

class Impl extends GeneratingStatementVisitor<Parser.Statement> {
    private pushedIds: Record<string, Entry> = {};
    private poppedIds: Record<string, Entry> = {};

    *onSettingShift(statement: Parser.SettingShift): IterableIterator<Parser.SettingShift> {
        if (statement.setting.value !== "researchIgnore") {
            return yield statement;
        }

        const collection = statement.operator === "<<" ? this.pushedIds : this.poppedIds;

        for (const id of statement.values) {
            if (id.type !== "Identifier") {
                throw new CompileError("Identifier expected", id);
            }

            if (!(id.value in techIds)) {
                throw new CompileError(`Unknown research '${id.value}'`, id);
            }

            const entry = collection[id.value];
            if (entry !== undefined) {
                entry.condition = this.disjunction(entry.condition, statement.condition);
            }
            else {
                collection[id.value] = {
                    tech: id.value,
                    condition: statement.condition
                };
            }
        }
    }

    processStatements(statements: Parser.Statement[]): Parser.Statement[] {
        return [...this.visitAll(statements), ...this.generateStatements()];
    }

    private *generateStatements(): IterableIterator<Parser.SettingAssignment | Parser.SettingPush> {
        const defaultIgnoreList: string[] = [];

        for (const { tech, condition } of Object.values(this.poppedIds)) {
            if (condition === undefined) {
                delete this.pushedIds[tech];
            }
        }

        for (const { tech, condition } of Object.values(this.pushedIds)) {
            if (condition === undefined) {
                defaultIgnoreList.push(tech);
            }
            else {
                yield {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: tech },
                    condition
                };
            }
        }

        for (const { tech, condition } of Object.values(this.poppedIds)) {
            if (tech in this.pushedIds) {
                yield {
                    type: "SettingAssignment",
                    setting: { type: "Identifier", value: "researchIgnore" },
                    value: { type: "String", value: tech },
                    condition
                };
            }
        }

        if (defaultIgnoreList.length !== 0) {
            yield {
                type: "SettingPush",
                setting: { type: "Identifier", value: "researchIgnore" },
                values: defaultIgnoreList
            };
        }
    }

    private disjunction(l?: Parser.Expression, r?: Parser.Expression): Parser.Expression | undefined {
        if (l === undefined || r === undefined) {
            return undefined;
        }

        return {
            type: "Expression",
            operator: "or",
            args: [l, r]
        };
    }
}

export function collectIgnoredTechs(statements: Parser.Statement[], sourceMap: SourceMap, errors: CompileError[]): Parser.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.processStatements(statements);
}
