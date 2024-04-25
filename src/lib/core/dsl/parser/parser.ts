import { CharStream, CommonTokenStream } from "antlr4ng";
import { ErrorStrategy, ErrorListener } from "./errors";
import { contextLocation, tokenLocation, type ParseError } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";

import settingPrefixes from "$lib/core/model/prefixes";
import { all as logSuffixes } from "$lib/core/model/logSettings";

import type * as Context from "./.antlr/DSLParser";
import type { Statement } from "$lib/core/dsl/model";

export type ParseResult = {
    statements: Statement[],
    errors: ParseError[]
}

class SettingIdGetter extends DSLVisitor<string> {
    visitSetting = (ctx: Context.SettingContext) => {
        return this.visit(ctx.settingId())!;
    }

    visitSimpleSettingId = (ctx: Context.SimpleSettingIdContext) => {
        return ctx.Identifier().getText();
    }

    visitCompoundSettingId = (ctx: Context.CompoundSettingIdContext) => {
        const name = ctx.Identifier(0)!;
        const argument = ctx.Identifier(1)!;

        const prefix = settingPrefixes[name.getText()];
        if (prefix === undefined) {
            throw { message: `Unknown setting prefix '${name.getText()}'`, ...tokenLocation(name.symbol) };
        }

        if (logSuffixes.indexOf(argument.getText()) === -1) {
            throw { message: `Unknown setting suffix '${argument.getText()}'`, ...tokenLocation(argument.symbol) };
        }

        return `${prefix}${argument.getText()}`;
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

    private statements: Statement[] = [];

    constructor(private errors: ParseError[]) {
        super();
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const settingName = this.settingIdGetter.visit(ctx.setting())!;
        const settingValue = this.settingValueGetter.visit(ctx.value());

        this.statements.push({
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        });
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
            statements: this.statements,
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
    const visitor = new Visitor(errors);

    return visitor.visit(tree);
}
