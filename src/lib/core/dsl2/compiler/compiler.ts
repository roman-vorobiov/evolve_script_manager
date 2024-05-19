import { ParseError } from "../model";

import type * as Parser from "../model/1";
import type * as Domain from "$lib/core/domain/model";

export type CompileResult = {
    config: Domain.Config,
    errors: ParseError[],
}

export function compile(statements: Parser.Statement[]): CompileResult {
    const config: Domain.Config = { overrides: {}, triggers: [] };

    return { config, errors: [] };
}
