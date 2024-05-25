import { parseSource } from "./parser/parser";
import { compile } from "./compiler/compiler";
import { ParseError } from "./model"

import type * as Domain from "$lib/core/domain/model";
import { CompileError } from "./model"
import type { SourceLocation, SourceMap } from "./parser/source";

export type ProblemInfo = {
    type: "error" | "info",
    message: string,
    location?: SourceLocation
}

function* resolveError(error: CompileError | ParseError, sourceMap: SourceMap): IterableIterator<ProblemInfo> {
    if (error instanceof CompileError) {
        yield {
            type: "error",
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

function* resolveErrors(errors: (CompileError | ParseError)[], sourceMap: SourceMap): IterableIterator<ProblemInfo> {
    for (const error of errors) {
        yield* resolveError(error, sourceMap);
    }
}

export type CompileResult = {
    config: Domain.Config | null,
    errors: ProblemInfo[],
}

export function fromSource(rawText: string): CompileResult {
    const parseResult = parseSource(rawText);
    if (parseResult.errors.length !== 0) {
        return {
            config: null,
            errors: [...resolveErrors(parseResult.errors, parseResult.sourceMap)]
        };
    }

    const compileResult = compile(parseResult.nodes, parseResult.sourceMap);

    return {
        config: compileResult.config,
        errors: [...resolveErrors(compileResult.errors, parseResult.sourceMap)]
    };
}
