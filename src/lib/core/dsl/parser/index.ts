import { parse } from "./parser";
import { compile } from "./compiler";

export type { ParseError } from "./utils";

export function fromDSL(rawText: string) {
    const parseResult = parse(rawText);
    if (parseResult.errors.length !== 0) {
        return { config: null, errors: parseResult.errors };
    }

    return { config: compile(parseResult.statements), errors: [] };
}
