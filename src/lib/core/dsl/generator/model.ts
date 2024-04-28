import type { ParseError } from "../parser/model";

export type GenerationResult = {
    config: any,
    errors: ParseError[]
}
