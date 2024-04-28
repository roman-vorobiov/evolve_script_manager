import {
    DefaultErrorStrategy,
    BaseErrorListener,
    RecognitionException,
    LexerNoViableAltException,
    Parser
} from "antlr4ng";

import { withLocation } from "./utils";
import type { ParseError } from "./model";

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

        this.dispatch(recognizer, withLocation(token, { message }));
    }

    reportInputMismatch(recognizer: Parser) {
        const token = recognizer.getCurrentToken();
        const received = this.getTokenErrorDisplay(token);

        const message = `Unexpected ${received}`;

        this.dispatch(recognizer, withLocation(token, { message }));
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
            this.errors.push({ message: "Unexpected symbol", location: defaultPosition });
        }
        else {
            this.errors.push({ message: "Unknown error", location: defaultPosition });
            console.error(e);
        }
    }
}
