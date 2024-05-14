import {
    DefaultErrorStrategy,
    BaseErrorListener,
    RecognitionException,
    LexerNoViableAltException,
    Parser,
    NoViableAltException
} from "antlr4ng";

import { ParseError } from "./model";

export class ErrorStrategy extends DefaultErrorStrategy {
    private dispatch(recognizer: Parser, error: ParseError) {
        recognizer.notifyErrorListeners("", null, error as any);
    }

    reportNoViableAlternative(recognizer: Parser, e: NoViableAltException) {
        this.reportInputMismatch(recognizer);
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

        this.dispatch(recognizer, new ParseError(`Missing ${expected}`, token));
    }

    reportInputMismatch(recognizer: Parser) {
        const token = recognizer.getCurrentToken();
        const received = this.getTokenErrorDisplay(token);

        this.dispatch(recognizer, new ParseError(`Unexpected ${received}`, token));
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

        if (e instanceof ParseError) {
            this.errors.push(e);
        }
        else if (e instanceof LexerNoViableAltException) {
            this.errors.push(new ParseError("Unexpected symbol", defaultPosition));
        }
        else {
            this.errors.push(new ParseError("Unknown error", defaultPosition));
            console.error(e);
        }
    }
}
