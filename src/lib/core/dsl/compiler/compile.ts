import { compileSettingAssignment } from "./settings";
import { compileTrigger } from "./triggers";
import { ParseError } from "../parser/model";

import type { SourceTracked } from "../parser/source";
import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function *normalize(nodes: SourceTracked<Parser.Node>[], errors: ParseError[]): Generator<Compiler.Statement> {
    for (let node of nodes) {
        try {
            if (node.type === "SettingAssignment") {
                yield* compileSettingAssignment(node);
            }
            else if (node.type === "Trigger") {
                yield* compileTrigger(node);
            }
            else {
                console.error(`Unknown node: ${(node as any).type}`);
            }
        }
        catch (e) {
            if (e instanceof ParseError) {
                errors.push(e);
            }
            else {
                throw e;
            }
        }
    }
}

export function compile(nodes: SourceTracked<Parser.Node>[]): Compiler.CompilationResult {
    const errors: ParseError[] = [];
    const statements = [...normalize(nodes, errors)];

    return { statements, errors };
}
