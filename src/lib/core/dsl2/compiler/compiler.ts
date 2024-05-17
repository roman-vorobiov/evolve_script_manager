import type * as Parser from "../model";
import type * as Domain from "$lib/core/domain/model";

export type CompileResult = {
    config: Domain.Config,
    errors: Parser.ParseError[],
}

export function compile(statements: Parser.Statement[]): CompileResult {
    const config: Domain.Config = { overrides: {}, triggers: [] };

    return { config, errors: [] };
}
