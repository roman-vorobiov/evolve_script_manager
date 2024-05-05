import { compileSettingAssignment } from "./settings";
import { compileTrigger, compileTriggerChain } from "./triggers";

import type * as Parser from "../parser/model";
import type * as Compiler from "./model";

function *normalize(nodes: Parser.Node[], errors: Parser.ParseError[]): Generator<Compiler.Statement> {
    const dispatch = {
        SettingAssignment: compileSettingAssignment,
        Trigger: compileTrigger,
        TriggerChain: compileTriggerChain
    };

    function isParseError(error: any): error is Parser.ParseError {
        return error.message !== undefined && error.location !== undefined;
    }

    for (let node of nodes) {
        try {
            const impl = dispatch[node.type];
            if (impl !== undefined) {
                yield* impl(node as any);
            }
            else {
                console.error(`Unknown node: ${node.type}`);
            }
        }
        catch (e) {
            if (isParseError(e)) {
                errors.push(e);
            }
            else {
                throw e;
            }
        }
    }
}

export function compile(nodes: Parser.Node[]): Compiler.CompilationResult {
    const errors: Parser.ParseError[] = [];
    const statements = [...normalize(nodes, errors)];

    return { statements, errors };
}
