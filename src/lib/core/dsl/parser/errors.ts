import {
    DefaultErrorStrategy,
    BaseErrorListener,
    RecognitionException,
    LexerNoViableAltException,
    Parser
} from "antlr4ng";

import { tokenLocation, type ParseError } from "./utils";

class InterceptedError {
    constructor(public error: ParseError) {}
}

export class ErrorStrategy extends DefaultErrorStrategy {
    private dispatch(recognizer: Parser, error: ParseError) {
        recognizer.notifyErrorListeners("", null, new InterceptedError(error) as any);
    }

    reportUnwantedToken(recognizer: Parser) {
        if (this.inErrorRecoveryMode(recognizer)) {
            return;
        }

        this.beginErrorCondition(recognizer);

        this.reportInputMismatch(recognizer);
    }

    reportMissingToken(recognizer: Parser) {
        if (this.inErrorRecoveryMode(recognizer)) {
            return;
        }

        this.beginErrorCondition(recognizer);

        const token = recognizer.getCurrentToken();
        const expected = this.getExpectedTokens(recognizer).toStringWithVocabulary(recognizer.vocabulary);

        const message = `Missing ${expected}`;

        this.dispatch(recognizer, { message, ...tokenLocation(token) });
    }

    reportInputMismatch(recognizer: Parser) {
        const token = recognizer.getCurrentToken();
        const received = this.getTokenErrorDisplay(token);

        const message = `Unexpected ${received}`;

        this.dispatch(recognizer, { message, ...tokenLocation(token) });
    }
}

export class ErrorListener extends BaseErrorListener {
    constructor(private errors: ParseError[]) {
        super();
    }

    syntaxError(
        recognizer: unknown,
        offendingSymbol: unknown,
        line: number,
        charPositionInLine: number,
        msg: string | null,
        e: RecognitionException | null
    ) {
        const defaultPosition = {
            start: { line, column: charPositionInLine + 1 },
            stop: { line, column: charPositionInLine + 2 }
        };

        if (e instanceof InterceptedError) {
            this.errors.push(e.error);
        }
        else if (e instanceof LexerNoViableAltException) {
            this.errors.push({ message: "Unexpected symbol", ...defaultPosition });
        }
        else {
            this.errors.push({ message: "Unknown error", ...defaultPosition });
            console.error(e);
        }
    }
}
