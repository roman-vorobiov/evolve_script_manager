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
    function getMainInfo(importStack: SourceLocation[], originalLocation: SourceLocation) {
        if (importStack.length === 0) {
            return { message: error.message, location: originalLocation };
        }
        else {
            return {
                message: `In '${originalLocation?.file}': ${error.message}`,
                location: importStack[0]
            };
        }
    }

    function *printImportStack(importStack: SourceLocation[], location: SourceLocation): IterableIterator<ProblemInfo> {
        for (let i = 1; i <= importStack.length; ++i) {
            yield {
                type: "info",
                message: `Imported from '${importStack.at(-i)!.file}'`,
                location
            };
        }
    }

    if (error instanceof CompileError || error instanceof CompileWarning) {
        const importStack = sourceMap.getImportStack(error.offendingEntity);
        const originalLocation = sourceMap.findLocation(error.offendingEntity);
        const { message, location } = getMainInfo(importStack, originalLocation!);

        yield {
            type: error instanceof CompileError ? "error" : "warning",
            message,
            location
        };

        for (const [detail, entity] of error.details) {
            yield {
                type: "info",
                message: detail,
                location: sourceMap.findLocation(entity)
            };
        }

        yield* printImportStack(importStack, location);
    }
    else {
        const originalLocation = error.location;
        const { message, location } = getMainInfo(error.importStack, originalLocation!);

        yield {
            type: "error",
            message,
            location
        };

        yield* printImportStack(error.importStack, location);
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
