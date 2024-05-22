import { triggerConditions, triggerActions } from "$lib/core/domain/triggers";
import { GeneratingStatementVisitor } from "./utils";
import { ParseError } from "$lib/core/dsl2/model";

import type { SourceMap } from "../parser/source";
import type * as Before from "../model/8";
import type * as After from "../model/9";

const chainCondition = {
    type: { type: "Identifier", value: "Chain" },
    id: { type: "Identifier", value: "" },
    count: { type: "Number", value: 0 }
};

class Impl extends GeneratingStatementVisitor {
    *onTrigger(statement: Before.Trigger): IterableIterator<After.Trigger> {
        if (statement.actions.length === 0) {
            return;
        }

        const iterator = statement.actions.values();

        yield this.deriveLocation(statement, <After.Trigger> {
            type: "Trigger",
            condition: this.normalizeCondition(statement.condition),
            action: this.normalizeAction(iterator.next().value)
        });

        for (const tail of iterator) {
            yield this.deriveLocation(statement, <After.Trigger> {
                type: "Trigger",
                condition: chainCondition,
                action: this.normalizeAction(tail)
            });
        }
    }

    private normalizeCondition(arg: Before.TriggerArgument): After.TriggerArgument {
        this.validateCondition(arg);

        const count = this.ensureCount(arg);

        if (count !== arg.count) {
            return this.derived(arg, {
                count: this.ensureCount(arg)
            });
        }
        else {
            return arg as After.TriggerArgument;
        }
    }

    private normalizeAction(arg: Before.TriggerArgument): After.TriggerArgument {
        this.validateAction(arg);

        const id = this.resolveAliases(arg);
        const count = this.ensureCount(arg);

        if (id !== arg.id || count !== arg.count) {
            return this.derived(arg, {
                id: this.resolveAliases(arg),
                count: this.ensureCount(arg)
            });
        }
        else {
            return arg as After.TriggerArgument;
        }
    }

    private validateCondition(arg: Before.TriggerArgument) {
        const info = triggerConditions[arg.type.value as keyof typeof triggerConditions];

        if (info === undefined) {
            throw new ParseError(`Unknown trigger condition '${arg.type.value}'`, arg.type);
        }

        if (!info.allowedValues.includes(arg.id.value)) {
            throw new ParseError(`Unknown ${info.type} '${arg.id.value}'`, arg.id);
        }
    }

    private validateAction(arg: Before.TriggerArgument) {
        const info = triggerActions[arg.type.value as keyof typeof triggerActions];

        if (info === undefined) {
            throw new ParseError(`Unknown trigger action '${arg.type.value}'`, arg.type);
        }

        if (!info.allowedValues.includes(arg.id.value)) {
            throw new ParseError(`Unknown ${info.type} '${arg.id.value}'`, arg.id);
        }
    }

    private ensureCount(arg: Before.TriggerArgument): After.NumberLiteral {
        if (arg.count === undefined) {
            return { type: "Number", value: 1 };
        }

        if (!Number.isInteger(arg.count.value)) {
            throw new ParseError("Expected integer, got float", arg.count);
        }

        return arg.count;
    }

    private resolveAliases(arg: Before.TriggerArgument): After.Identifier {
        if (arg.type.value === "Arpa") {
            return this.derived(arg.id, { value: `arpa${arg.id.value}` });
        }
        else {
            return arg.id;
        }
    }
};

export function createTriggerChains(statements: Before.Statement[], sourceMap: SourceMap): After.Statement[] {
    const impl = new Impl(sourceMap);

    return impl.visitAll(statements as any) as After.Statement[];
}
