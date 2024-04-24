import { ParserRuleContext, Token } from "antlr4ng";

export function contextLocation(ctx: ParserRuleContext) {
    return {
        start: {
            line: ctx.start!.line,
            column: ctx.start!.column + 1
        },
        stop: {
            line: ctx.stop!.line,
            column: ctx.stop!.column
        }
    }
}

export function tokenLocation(token: Token) {
    const length = token.stop - token.start;

    return {
        start: { line: token.line, column: token.column + 1 },
        stop: { line: token.line, column: token.column + 2 + length }
    };
}
