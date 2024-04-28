import { CharStream, CommonTokenStream, TerminalNode } from "antlr4ng";
import { ErrorStrategy, ErrorListener } from "./errors";
import { withLocation } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";

import type * as Parser from "./model";
import type * as Context from "./.antlr/DSLParser";

function getCallExpression<T extends { Identifier(i: number): TerminalNode | null }>(ctx: T): Parser.CallExpression {
    const name = ctx.Identifier(0)!;
    const argument = ctx.Identifier(1)!;

    return {
        name: withLocation(name.symbol, name.getText()),
        argument: withLocation(argument.symbol, argument.getText())
    };
}

class SettingIdGetter extends DSLVisitor<Parser.Setting> {
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
        return {
            expression: getCallExpression(ctx)
        };
    }
}

class SettingValueGetter extends DSLVisitor<Parser.SourceTracked<any>> {
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

    private nodes: Parser.Node[] = [];

    constructor(private errors: Parser.ParseError[]) {
        super();
    }

    visitRoot = (ctx: Context.RootContext) => {
        ctx.children.forEach(child => {
            try {
                this.visit(child);
            }
            catch (e) {
                this.errors.push(e as Parser.ParseError);
            }
        });

        return {
            nodes: this.nodes,
            errors: this.errors
        };
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

    visitTrigger = (ctx: Context.TriggerContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "Trigger",
            action: getCallExpression(ctx.triggerAction()),
            condition: getCallExpression(ctx.triggerCondition())
        }));
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "TriggerChain",
            condition: getCallExpression(ctx.triggerCondition()),
            actions: ctx.triggerAction().map(getCallExpression)
        }));
    }
}

export function parse(rawText: string): Parser.ParseResult {
    let errors: Parser.ParseError[] = [];

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
