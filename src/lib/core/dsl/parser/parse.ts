import { CharStream, CommonTokenStream } from "antlr4ng";
import { ErrorStrategy, ErrorListener } from "./errors";
import { withLocation } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";

import type { SourceTracked } from "./source";
import type * as Parser from "./model";
import type * as Context from "./.antlr/DSLParser";

class ExpressionGetter extends DSLVisitor<any> {
    visitExpression = (ctx: Context.ExpressionContext): Parser.Expression => {
        if (ctx._op) {
            return withLocation(ctx, {
                op: withLocation(ctx._op, ctx._op.text!),
                arguments: ctx.expression().map(expr => this.visit(expr))
            });
        }
        else {
            const expression = (ctx.unaryExpression() || ctx.expression(0))!;
            return this.visit(expression);
        }
    }

    visitIdentifier = (ctx: Context.IdentifierContext): Parser.CallExpression => {
        const [name, ...args] = ctx.Identifier();

        return withLocation(ctx, {
            name: withLocation(name.symbol, name.getText()),
            arguments: args.map(arg => withLocation(arg.symbol, arg.getText()))
        });
    }

    visitStringValue = (ctx: Context.StringValueContext): SourceTracked<String> => {
        return withLocation(ctx, ctx.getText());
    }

    visitBooleanValue = (ctx: Context.BooleanValueContext): SourceTracked<Boolean> => {
        return withLocation(ctx, ctx.getText() === "ON");
    }

    visitNumericValue = (ctx: Context.NumericValueContext): SourceTracked<Number> => {
        return withLocation(ctx, new Number(ctx.getText()));
    }
}

class TriggerGetter extends DSLVisitor<SourceTracked<Parser.CallExpression>> {
    visitTriggerActionOrCondition = (ctx: Context.TriggerActionOrConditionContext) => {
        const [t, id] = ctx.Identifier();
        const count = ctx.Number();

        const args: SourceTracked<Parser.Value>[] = [withLocation(id.symbol, id.getText())];
        if (count !== null) {
            args.push(withLocation(count.symbol, new Number(count.getText())));
        }

        return withLocation(ctx, {
            name: withLocation(t.symbol, t.getText()),
            arguments: args
        });
    }
}

class Visitor extends DSLVisitor<any> {
    private expressionGetter = new ExpressionGetter();
    private triggerGetter = new TriggerGetter();

    private nodes: SourceTracked<Parser.Node>[] = [];
    private errors: Parser.ParseError[] = [];

    visitRoot = (ctx: Context.RootContext): Parser.ParseResult => {
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
        const settingName = this.expressionGetter.visit(ctx.identifier())!;
        const settingValue = this.expressionGetter.visit(ctx.value());

        const node: Parser.SettingAssignment = {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        };

        if (ctx.expression() !== null) {
            node.condition = this.expressionGetter.visit(ctx.expression()!);
        }

        this.nodes.push(withLocation(ctx, node));
    }

    visitTrigger = (ctx: Context.TriggerContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "Trigger",
            action: this.triggerGetter.visit(ctx.triggerAction())!,
            condition: this.triggerGetter.visit(ctx.triggerCondition())!
        }));
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "TriggerChain",
            condition: this.triggerGetter.visit(ctx.triggerCondition())!,
            actions: ctx.triggerAction().map(c => this.triggerGetter.visit(c)!)
        }));
    }
}

export function parse(rawText: string): Parser.ParseResult {
    const chars = CharStream.fromString(rawText);
    const lexer = new DSLLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new DSLParser(tokens);

    let errors: Parser.ParseError[] = [];
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

    const visitor = new Visitor();
    return visitor.visit(tree);
}
