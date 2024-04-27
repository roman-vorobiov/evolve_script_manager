import type { Assertion, AsymmetricMatchersContaining } from "vitest";
import type { SourceLocation } from "$lib/core/dsl/parser/model";

type NodeParseExpectation = { from?: SourceLocation, into?: any }

interface CustomMatchers<R = unknown> {
    toBeParsed: (expectation: NodeParseExpectation) => R
}

declare module 'vitest' {
    interface Assertion<T = any> extends CustomMatchers<T> {}
    interface AsymmetricMatchersContaining extends CustomMatchers {}
}
