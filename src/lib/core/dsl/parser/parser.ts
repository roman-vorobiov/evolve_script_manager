import { CharStream, CommonTokenStream } from "antlr4ng";
import { ErrorStrategy, ErrorListener, type ParseError } from "./errors";
import { contextLocation } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";
import type * as Context from "./.antlr/DSLParser";

class SettingIdGetter extends DSLVisitor<string> {
    private prefix: any = {
        "Log": "log_"
    };

    visitSimpleSettingId = (ctx: Context.SimpleSettingIdContext) => {
        return ctx.Identifier().getText();
    }

    visitCompoundSettingId = (ctx: Context.CompoundSettingIdContext) => {
        const prefix = this.prefix[ctx.Identifier(0)!.getText()];
        if (prefix === undefined) {
            throw { message: "Unknown prefix", ...contextLocation(ctx) };
        }
        const suffix = ctx.Identifier(1)!.getText();
        return `${prefix}${suffix}`;
    }
}

class SettingValueGetter extends DSLVisitor<any> {
    visitBooleanValue = (ctx: Context.BooleanValueContext) => {
        return ctx.getText() === "ON";
    }

    visitStringValue = (ctx: Context.StringValueContext) => {
        return ctx.getText();
    }
}

class Visitor extends DSLVisitor<any> {
    private settingIdGetter = new SettingIdGetter();
    private settingValueGetter = new SettingValueGetter();

    private result: any = {};

    constructor(private errors: ParseError[]) {
        super();
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const key = this.settingIdGetter.visit(ctx.setting().settingId())!;
        const value = this.settingValueGetter.visit(ctx.value());

        this.result[key] = value;
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

        if (this.errors.length === 0) {
            return this.result;
        }
        else {
            return null;
        }
    }
}

export function parse(rawText: string) {
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
    const visitor = new Visitor(errors);
    const config = visitor.visit(tree);

    return { config, errors };
}
