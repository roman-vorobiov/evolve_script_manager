import { GeneratingStatementVisitor } from "./utils";

import type { SourceMap } from "../parser/source";
import type { CompileError } from "../model";
import type * as Parser from "../model/10";

function makeDummyOverride(body: string): Parser.SettingAssignment {
    return {
        type: "SettingAssignment",
        setting: { type: "Identifier", value: "masterScriptToggle" },
        value: { type: "Boolean", value: true },
        condition: {
            type: "Expression",
            operator: "and",
            args: [
                { type: "Eval", value: body },
                { type: "Boolean", value: false }
            ]
        }
    };
}

class Impl extends GeneratingStatementVisitor<Parser.Statement> {
    private idx: number = 0;

    *onTrigger(statement: Parser.Trigger): IterableIterator<Parser.Trigger | Parser.SettingAssignment> {
        yield statement;

        if (statement.condition !== undefined) {
            yield makeDummyOverride(`TriggerManager.priorityList[${this.idx}].complete = !(${statement.condition.value})`);
        }

        ++this.idx;
    }
}

export function createTriggerConditions(statements: Parser.Statement[], sourceMap: SourceMap, errors: CompileError[]): Parser.Statement[] {
    const impl = new Impl(sourceMap, errors);

    return impl.visitAll(statements);
}
