import { parseSource } from "./parser/parser";
import { compile } from "./compiler/compiler";
import { ParseError, CompileError, CompileWarning } from "./model";

import type * as Domain from "$lib/core/domain/model";
import type { SourceLocation, SourceMap } from "./parser/source";

export type ProblemInfo = {
    type: "error" | "warning" | "info",
    message: string,
    location?: SourceLocation
}

type InternalError = ParseError | CompileError | CompileWarning;

function* resolveError(error: InternalError, sourceMap: SourceMap): IterableIterator<ProblemInfo> {
    if (error instanceof CompileError || error instanceof CompileWarning) {
        yield {
            type: error instanceof CompileError ? "error" : "warning",
            message: error.message,
            location: sourceMap.findLocation(error.offendingEntity)
        };

        for (const [detail, entity] of error.details) {
            yield {
                type: "info",
                message: detail,
                location: sourceMap.findLocation(entity)
            };
        }
    }
    else {
        yield {
            type: "error",
            message: error.message,
            location: error.location
        };
    }
}

function* resolveErrors(errors: InternalError[], sourceMap: SourceMap): IterableIterator<ProblemInfo> {
    for (const error of errors) {
        yield* resolveError(error, sourceMap);
    }
}

export type CompileResult = {
    config: Domain.Config | null,
    errors: ProblemInfo[],
}

export function fromSource(model: Record<string, string>, target: string): CompileResult {
    const parseResult = parseSource(model, target);
    if (parseResult.errors.length !== 0) {
        return {
            config: null,
            errors: [...resolveErrors(parseResult.errors, parseResult.sourceMap)]
        };
    }

    const compileResult = compile(parseResult.nodes, parseResult.sourceMap);

    return {
        config: compileResult.config,
        errors: [
            ...resolveErrors(compileResult.errors, parseResult.sourceMap),
            ...resolveErrors(compileResult.warnings, parseResult.sourceMap)
        ]
    };
}
