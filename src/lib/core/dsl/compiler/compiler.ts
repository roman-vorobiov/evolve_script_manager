import { CompileError } from "../model";
import { inlineReferences } from "./inlineReferences";
import { resolveWildcards } from "./wildcards";
import { resolveFolds } from "./folds";
import { resolvePlaceholders } from "./placeholders";
import { resolvePrefixes } from "./prefixes";
import { resolveAliases } from "./aliases";
import { validateTypes } from "./validation";
import { applyConditionBlocks } from "./conditionBlocks";
import { collectLogFilterStrings } from "./logFilter";
import { collectIgnoredTechs } from "./ignoredResearch";
import { flattenExpressions } from "./conditions";
import { createTriggerChains } from "./triggers";
import { normalizeStatements } from "./normalize";

import type * as Domain from "$lib/core/domain/model";
import type { Initial, Final } from "../model";
import type { SourceMap } from "../parser/source";

class Pipeline<T = Initial.Statement> {
    constructor(private statements: T[], private sourceMap: SourceMap, private errors: CompileError[]) {}

    then<U>(pipe: (_: T[], sm: SourceMap, e: CompileError[]) => U[]): Pipeline<U> {
        return new Pipeline(pipe(this.statements, this.sourceMap, this.errors), this.sourceMap, this.errors);
    }

    flush() {
        return this.statements;
    }
}

function process(statements: Initial.Statement[], sourceMap: SourceMap, errors: CompileError[]): Final.Statement[] {
    return new Pipeline(statements, sourceMap, errors)
        .then(inlineReferences)
        .then(resolveWildcards)
        .then(resolveFolds)
        .then(resolvePlaceholders)
        .then(resolvePrefixes)
        .then(resolveAliases)
        .then(validateTypes)
        .then(applyConditionBlocks)
        .then(collectLogFilterStrings)
        .then(collectIgnoredTechs)
        .then(flattenExpressions)
        .then(createTriggerChains)
        .then(normalizeStatements)
        .flush();
}

function fillConfig(config: Domain.Config, statements: Final.Statement[]) {
    for (const statement of statements) {
        if (statement.type === "SettingAssignment") {
            config[statement.setting] = statement.value;
        }
        else if (statement.type === "Override") {
            const overrides = config.overrides[statement.setting] ??= [];
            overrides.push(statement.value);
        }
        else if (statement.type === "Trigger") {
            config.triggers.push(statement.value);
        }
    }
}

export type CompileResult = {
    config: Domain.Config | null,
    errors: CompileError[],
}

export function compile(statements: Initial.Statement[], sourceMap: SourceMap): CompileResult {
    const config: Domain.Config = { overrides: {}, triggers: [] };
    const errors: CompileError[] = [];

    try {
        const processed = process(statements, sourceMap, errors);
        fillConfig(config, processed);
    }
    catch (e) {
        console.error(e);
    }

    return { config, errors };
}
