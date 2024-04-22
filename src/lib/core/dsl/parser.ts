import { CharStream, CommonTokenStream } from "antlr4ng";
import { VollchLexer } from "./grammar/.antlr/VollchLexer";
import { VollchParser } from "./grammar/.antlr/VollchParser";
import { VollchVisitor } from "./grammar/.antlr/VollchVisitor";
import type * as Context from "./grammar/.antlr/VollchParser";

class Visitor extends VollchVisitor<any> {
    result: any = {};

    public visitRoot = (ctx: Context.RootContext) => {
        ctx.children.forEach(child => {
            this.visit(child);
        });

        return this.result;
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const key = ctx.setting().Identifier().getText();
        const value = this.visit(ctx.value());

        this.result[key] = value;
    }

    visitBooleanValue = (ctx: Context.BooleanValueContext) => {
        return ctx.getText() === "ON";
    }
}

export function parse(rawText: string) {
    console.clear();

    const chars = CharStream.fromString(rawText);
    const lexer = new VollchLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new VollchParser(tokens);
    const tree = parser.root();

    const visitor = new Visitor();
    return visitor.visit(tree);
}
