import { parse } from "./parser/parse";
import { compile } from "./compiler/compile";
import { generateConfig } from "./generator/generate";

import type { GenerationResult } from "./generator/model";

export type { ParseError } from "./parser/model";

export function fromSource(rawText: string): GenerationResult {
    const parseResult = parse(rawText);
    if (parseResult.errors.length !== 0) {
        return { config: null, errors: parseResult.errors };
    }

    const compileResult = compile(parseResult.nodes);
    if (compileResult.errors.length !== 0) {
        return { config: null, errors: compileResult.errors };
    }

    return generateConfig(compileResult.statements);
}
