import { CharStream, CommonTokenStream } from "antlr4ng";
import { ErrorStrategy, ErrorListener } from "./errors";
import { withLocation } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";

import type { ParseError, ParseResult, Node, Setting, SourceTracked } from "./model";
import type * as Context from "./.antlr/DSLParser";

class SettingIdGetter extends DSLVisitor<Setting> {
    visitSetting = (ctx: Context.SettingContext) => {
        return this.visit(ctx.settingId())!;
    }

    visitSimpleSettingId = (ctx: Context.SimpleSettingIdContext) => {
        const name = ctx.Identifier();

        return {
            name: withLocation(name.symbol, name.getText())
        };
    }

    visitCompoundSettingId = (ctx: Context.CompoundSettingIdContext) => {
        const name = ctx.Identifier(0)!;
        const argument = ctx.Identifier(1)!;

        return {
            expression: {
                name: withLocation(name.symbol, name.getText()),
                argument: withLocation(argument.symbol, argument.getText())
            }
        };
    }
}

class SettingValueGetter extends DSLVisitor<SourceTracked<any>> {
    visitBooleanValue = (ctx: Context.BooleanValueContext) => {
        return withLocation(ctx, ctx.getText() === "ON");
    }

    visitStringValue = (ctx: Context.StringValueContext) => {
        return withLocation(ctx, ctx.getText());
    }

    visitNumericValue = (ctx: Context.NumericValueContext) => {
        return withLocation(ctx, new Number(ctx.getText()));
    }
}

class Visitor extends DSLVisitor<any> {
    private settingIdGetter = new SettingIdGetter();
    private settingValueGetter = new SettingValueGetter();

    private nodes: Node[] = [];

    constructor(private errors: ParseError[]) {
        super();
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const settingName = this.settingIdGetter.visit(ctx.setting())!;
        const settingValue = this.settingValueGetter.visit(ctx.value())!;

        this.nodes.push(withLocation(ctx, {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        }));
    }

    visitRoot = (ctx: Context.RootContext) => {
        ctx.children.forEach(child => {
            try {
                this.visit(child);
            }
            catch (e) {
                this.errors.push(e as ParseError);
            }
        });

        return {
            nodes: this.nodes,
            errors: this.errors
        };
    }
}

export function parse(rawText: string): ParseResult {
    let errors: ParseError[] = [];

    const chars = CharStream.fromString(rawText);
    const lexer = new DSLLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new DSLParser(tokens);

    const errorStrategy = new ErrorStrategy();
    const errorListener = new ErrorListener(errors);
    lexer.removeErrorListeners();
    lexer.addErrorListener(errorListener);
    parser.removeErrorListeners();
    parser.addErrorListener(errorListener);
    parser.errorHandler = errorStrategy;

    const tree = parser.root();
    if (errors.length !== 0) {
        return { nodes: [], errors };
    }

    const visitor = new Visitor(errors);
    return visitor.visit(tree);
}
