import techIds from "$lib/core/domain/tech";
import { CompileError } from "../model";
import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type * as Parser from "../model/7";

type Entry = {
    tech: string,
    condition?: Parser.Expression
}

class Impl extends GeneratingStatementVisitor<Parser.Statement> {
    private pushedIds: Record<string, Entry> = {};
    private poppedIds: Record<string, Entry> = {};

    *onSettingShift(statement: Parser.SettingShift): IterableIterator<Parser.SettingShift> {
        if (statement.setting.value !== "researchIgnore") {
            yield statement;
            return;
        }

        if (statement.value.type !== "Identifier") {
            throw new CompileError("Identifier expected", statement.value);
        }

        if (!(statement.value.value in techIds)) {
            throw new CompileError(`Unknown research '${statement.value.value}'`, statement.value);
        }

        const collection = statement.operator === "<<" ? this.pushedIds : this.poppedIds;

        const entry = collection[statement.value.value];
        if (entry !== undefined) {
            entry.condition = this.disjunction(entry.condition, statement.condition);
        }
        else {
            collection[statement.value.value] = {
                tech: statement.value.value,
                condition: statement.condition
            };
        }
    }

    visitAll(statements: Parser.Statement[]): Parser.Statement[] {
        return [...super.visitAll(statements), ...this.generateStatements()];
    }

    private *generateStatements(): IterableIterator<Parser.SettingAssignment | Parser.SettingShift> {
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
                type: "SettingAssignment",
                setting: { type: "Identifier", value: "researchIgnore" },
                value: { type: "String", value: defaultIgnoreList.join(",") }
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

export function collectIgnoredTechs(statements: Parser.Statement[], sourceMap: SourceMap): Parser.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements);
}
