import { parseSource } from "./parser/parser";
import { compile } from "./compiler/compiler";

import type { ParseError as RawError } from "./model"
import type * as Domain from "$lib/core/domain/model";
import type { SourceLocation, SourceMap } from "./parser/source";

type ParseError = {
    message: string,
    location?: SourceLocation
}

function resolveError(error: RawError, sourceMap: SourceMap): ParseError {
    return {
        message: error.message,
        location: sourceMap.findLocation(error.offendingEntity)
    };
}

function resolveErrors(errors: RawError[], sourceMap: SourceMap): ParseError[] {
    return errors.map(error => resolveError(error, sourceMap));
}

export type CompileResult = {
    config: Domain.Config | null,
    errors: ParseError[],
}

export function fromSource(rawText: string): CompileResult {
    const parseResult = parseSource(rawText);
    if (parseResult.errors.length !== 0) {
        return { config: null, errors: resolveErrors(parseResult.errors, parseResult.sourceMap) };
    }

    const compileResult = compile(parseResult.nodes, parseResult.sourceMap);

    return {
        config: compileResult.config,
        errors: resolveErrors(compileResult.errors, parseResult.sourceMap)
    };
}
