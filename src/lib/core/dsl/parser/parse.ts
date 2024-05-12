import { CharStream, CommonTokenStream } from "antlr4ng";
import { ParseError } from "./model";
import { ErrorStrategy, ErrorListener } from "./errors";
import { withLocation, stringContents } from "./utils";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";

import type { SourceTracked } from "./source";
import type * as Parser from "./model";
import type * as Context from "./.antlr/DSLParser";

class ExpressionGetter extends DSLVisitor<SourceTracked<Parser.Expression>> {
    visitExpression = (ctx: Context.ExpressionContext): SourceTracked<Parser.Expression> => {
        if (ctx._op) {
            return withLocation(ctx, {
                operator: withLocation(ctx._op, ctx._op.text!),
                args: ctx.expression().map(expr => this.visit(expr)!)
            });
        }
        else {
            const expression = (ctx.unaryExpression() || ctx.expression(0))!;
            return this.visit(expression)!;
        }
    }

    visitIdentifier = (ctx: Context.IdentifierContext): SourceTracked<Parser.Identifier> => {
        const [name, ...targets] = ctx.Identifier();

        const node = <Parser.Identifier> {
            name: withLocation(name.getSymbol(), name.getText()),
            targets: targets.map(t => withLocation(t.getSymbol(), t.getText()))
        };

        if (ctx.OR()) {
            node.disjunction = withLocation(ctx.OR()!.getSymbol(), true);
        }
        else if (ctx.Ellipsis()) {
            node.placeholder = withLocation(ctx.Ellipsis()!.getSymbol(), true);
        }
        else if (ctx.MUL()) {
            node.wildcard = withLocation(ctx.MUL()!.getSymbol(), true);
        }

        return withLocation(ctx, node);
    }

    visitEval = (ctx: Context.EvalContext): SourceTracked<Parser.Expression> => {
        const contents = stringContents(ctx.BigEval(), 2) ?? stringContents(ctx.SmallEval(), 1)!;

        return withLocation((ctx.BigEval() ?? ctx.SmallEval())!.getSymbol(), {
            name: withLocation(ctx, "Eval"),
            targets: [withLocation(ctx, contents.trim())]
        });
    }

    visitStringValue = (ctx: Context.StringValueContext): SourceTracked<String> => {
        return withLocation(ctx, stringContents(ctx));
    }

    visitBooleanValue = (ctx: Context.BooleanValueContext): SourceTracked<Boolean> => {
        return withLocation(ctx, ctx.getText() === "ON");
    }

    visitNumericValue = (ctx: Context.NumericValueContext): SourceTracked<Number> => {
        return withLocation(ctx, new Number(ctx.getText()));
    }
}

class TriggerGetter extends DSLVisitor<SourceTracked<Parser.TriggerArgument>> {
    visitTriggerActionOrCondition = (ctx: Context.TriggerActionOrConditionContext): SourceTracked<Parser.TriggerArgument> => {
        const [type, id] = ctx.Identifier();
        const count = ctx.Number();

        let node: Parser.TriggerArgument = {
            type: withLocation(type.getSymbol(), type.getText()),
            id: withLocation(id.getSymbol(), id.getText())
        };

        if (count !== null) {
            node.count = withLocation(count.getSymbol(), new Number(count.getText()));
        }

        return withLocation(ctx, node);
    }
}

class Visitor extends DSLVisitor<any> {
    private expressionGetter = new ExpressionGetter();
    private triggerGetter = new TriggerGetter();

    private nodes: SourceTracked<Parser.Node>[] = [];
    private errors: ParseError[] = [];

    visitRoot = (ctx: Context.RootContext): Parser.ParseResult => {
        ctx.children.forEach(child => {
            try {
                this.visit(child);
            }
            catch (e) {
                if (e instanceof ParseError) {
                    this.errors.push(e);
                }
                else {
                    throw e;
                }
            }
        });

        return {
            nodes: this.nodes,
            errors: this.errors
        };
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const settingName = this.expressionGetter.visit(ctx.settingId()) as SourceTracked<Parser.Identifier>;
        const settingValue = this.expressionGetter.visit(ctx.value()) as SourceTracked<Parser.Constant>;

        if (settingName.disjunction?.valueOf()) {
            throw new ParseError("Disjunction cannot be used in setting assignments", settingName.disjunction.location);
        }

        const node: Parser.SettingAssignment = {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        };

        if (ctx.expression() !== null) {
            node.condition = this.expressionGetter.visit(ctx.expression()!)!;
        }

        this.nodes.push(withLocation(ctx, node));
    }

    visitConditionBlock = (ctx: Context.ConditionBlockContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "ConditionPush",
            condition: this.expressionGetter.visit(ctx.expression())!
        }));

        try {
            ctx.settingStatement().forEach(s => this.visit(s));
        }
        finally {
            this.nodes.push(withLocation(ctx, {
                type: "ConditionPop",
            }));
        }
    }

    visitTrigger = (ctx: Context.TriggerContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "Trigger",
            condition: this.triggerGetter.visit(ctx.triggerCondition())!,
            actions: [this.triggerGetter.visit(ctx.triggerAction())!]
        }));
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        this.nodes.push(withLocation(ctx, {
            type: "Trigger",
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

    let errors: ParseError[] = [];
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
