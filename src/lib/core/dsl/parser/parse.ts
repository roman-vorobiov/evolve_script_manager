import { CharStream, CommonTokenStream, TerminalNode, type ParseTree } from "antlr4ng";
import { ErrorStrategy, ErrorListener } from "./errors";
import { withLocation } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";

import type * as Parser from "./model";
import type * as Context from "./.antlr/DSLParser";

class CallExpressionGetter extends DSLVisitor<Parser.CallExpression> {
    visitSettingId = (ctx: Context.SettingIdContext) => {
        const [name, ...args] = ctx.Identifier();

        return {
            name: withLocation(name.symbol, name.getText()),
            arguments: args.map(arg => withLocation(arg.symbol, arg.getText()))
        };
    }

    visitTriggerActionOrCondition = (ctx: Context.TriggerActionOrConditionContext) => {
        const [t, id] = ctx.Identifier();
        const count = ctx.Number();

        const args: Parser.SourceTracked<Parser.Value>[] = [withLocation(id.symbol, id.getText())];
        if (count !== null) {
            args.push(withLocation(count.symbol, new Number(count.getText())));
        }

        return {
            name: withLocation(t.symbol, t.getText()),
            arguments: args
        };
    }
}

class ValueGetter extends DSLVisitor<Parser.SourceTracked<String | Boolean | Number>> {
    visitStringValue = (ctx: Context.StringValueContext) => {
        return withLocation(ctx, ctx.getText());
    }

    visitBooleanValue = (ctx: Context.BooleanValueContext) => {
        return withLocation(ctx, ctx.getText() === "ON");
    }

    visitNumericValue = (ctx: Context.NumericValueContext) => {
        return withLocation(ctx, new Number(ctx.getText()));
    }
}

class Visitor extends DSLVisitor<any> {
    private valueGetter = new ValueGetter();
    private callExpressionGetter = new CallExpressionGetter();

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
        const settingName = this.callExpressionGetter.visit(ctx.settingId())!;
        const settingValue = this.valueGetter.visit(ctx.value())!;

        this.nodes.push(withLocation(ctx, {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        }));
    }

    visitTrigger = (ctx: Context.TriggerContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "Trigger",
            action: this.callExpressionGetter.visit(ctx.triggerAction())!,
            condition: this.callExpressionGetter.visit(ctx.triggerCondition())!
        }));
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "TriggerChain",
            condition: this.callExpressionGetter.visit(ctx.triggerCondition())!,
            actions: ctx.triggerAction().map(c => this.callExpressionGetter.visit(c)!)
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
