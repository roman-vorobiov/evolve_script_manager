import { parseSource } from "./parser/parser";
import { compile } from "./compiler/compiler";
import { ParseError } from "./model"

import type * as Domain from "$lib/core/domain/model";
import type { CompileError } from "./model"
import type { SourceMap } from "./parser/source";

function resolveError(error: CompileError, sourceMap: SourceMap): ParseError {
    return new ParseError(error.message, sourceMap.findLocation(error.offendingEntity));
}

function resolveErrors(errors: CompileError[], sourceMap: SourceMap): ParseError[] {
    return errors.map(error => resolveError(error, sourceMap));
}

export type CompileResult = {
    config: Domain.Config | null,
    errors: ParseError[],
}

export function fromSource(rawText: string): CompileResult {
    const parseResult = parseSource(rawText);
    if (parseResult.errors.length !== 0) {
        return { config: null, errors: parseResult.errors };
    }

    const compileResult = compile(parseResult.nodes, parseResult.sourceMap);

    return {
        config: compileResult.config,
        errors: resolveErrors(compileResult.errors, parseResult.sourceMap)
    };
}
