import { parse } from "./parser";
import { compile } from "./compiler";

import type { CompilationResult } from "./compiler/model";
export type { ParseError } from "./parser/model";

export function fromSource(rawText: string): CompilationResult {
    const parseResult = parse(rawText);
    if (parseResult.errors.length !== 0) {
        return { config: null, errors: parseResult.errors };
    }

    return compile(parseResult.nodes);
}
