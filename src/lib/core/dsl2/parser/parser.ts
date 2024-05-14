import { CharStream, CommonTokenStream, TerminalNode } from "antlr4ng";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";
import { ErrorStrategy, ErrorListener } from "./errors";
import { SourceMap } from "./source";
import { ParseError } from "./model";

import type * as Context from "./.antlr/DSLParser";
import type * as Parser from "./model";

function stringContents<T extends { getText(): string }>(token: T | null, quoteLength: number = 1): string | undefined {
    return token?.getText().slice(quoteLength, -quoteLength);
}

class BaseVisitor<T> extends DSLVisitor<T> {
    protected constructor(public sourceMap: SourceMap) {
        super();
    }

    protected token(token: TerminalNode): String {
        return this.sourceMap.addLocation(new String(token.getText()), token.getSymbol());
    }

    protected flag(token: TerminalNode): Boolean | undefined {
        return this.sourceMap.addLocation(new Boolean(true), token.getSymbol());
    }
}

class ExpressionGetter extends BaseVisitor<Parser.Expression> {
    constructor(sourceMap: SourceMap) {
        super(sourceMap);
    }

    visitExpression = (ctx: Context.ExpressionContext): Parser.Expression => {
        if (ctx._op) {
            const node: Parser.Expression = {
                operator: this.sourceMap.addLocation(new String(ctx._op.text!), ctx._op),
                args: ctx.expression().map(expr => this.visit(expr)!)
            };

            return this.sourceMap.addLocation(node, ctx);
        }
        else {
            const expression = (ctx.unaryExpression() || ctx.expression(0))!;
            return this.visit(expression)!;
        }
    }

    visitIdentifier = (ctx: Context.IdentifierContext): Parser.Identifier => {
        const [name, ...targets] = ctx.Identifier();

        const node: Parser.Identifier = {
            name: this.token(name),
            targets: targets.map(t => this.token(t))
        };

        if (ctx.OR()) {
            node.disjunction = this.flag(ctx.OR()!);
        }
        else if (ctx.Ellipsis()) {
            node.placeholder = this.flag(ctx.Ellipsis()!);
        }
        else if (ctx.MUL()) {
            node.wildcard = this.flag(ctx.MUL()!);
        }

        return this.sourceMap.addLocation(node, ctx);
    }

    visitEval = (ctx: Context.EvalContext): Parser.Expression => {
        const contents = stringContents(ctx.BigEval(), 2) ?? stringContents(ctx.SmallEval(), 1)!;

        const node: Parser.Identifier = {
            name: new String("Eval"),
            targets: [new String(contents.trim())]
        };

        // this.sourceMap.addLocation(node, (ctx.BigEval() ?? ctx.SmallEval())!.getSymbol());
        return this.sourceMap.addLocation(node, ctx);
    }

    visitStringValue = (ctx: Context.StringValueContext): String => {
        return this.sourceMap.addLocation(new String(stringContents(ctx)), ctx);
    }

    visitBooleanValue = (ctx: Context.BooleanValueContext): Boolean => {
        return this.sourceMap.addLocation(new Boolean(ctx.getText() === "ON"), ctx);
    }

    visitNumericValue = (ctx: Context.NumericValueContext): Number => {
        return this.sourceMap.addLocation(new Number(ctx.getText()), ctx);
    }
}

class TriggerGetter extends BaseVisitor<Parser.TriggerArgument> {
    constructor(sourceMap: SourceMap) {
        super(sourceMap);
    }

    visitTriggerActionOrCondition = (ctx: Context.TriggerActionOrConditionContext): Parser.TriggerArgument => {
        const [type, id] = ctx.Identifier();
        const count = ctx.Number();

        let node: Parser.TriggerArgument = {
            type: this.token(type),
            id: this.token(id)
        };

        if (count !== null) {
            node.count = this.sourceMap.addLocation(new Number(count.getText()), count.getSymbol());
        }

        return this.sourceMap.addLocation(node, ctx);
    }
}

class Visitor extends BaseVisitor<void> {
    private expressionGetter: ExpressionGetter;
    private triggerGetter: TriggerGetter;

    private nodes: Parser.Node[];
    private errors: Parser.ParseError[];

    constructor(sourceMap: SourceMap, nodes: Parser.Node[], errors: Parser.ParseError[]) {
        super(sourceMap);
        this.expressionGetter = new ExpressionGetter(sourceMap);
        this.triggerGetter = new TriggerGetter(sourceMap);
        this.nodes = nodes;
        this.errors = errors;
    }

    visitRoot = (ctx: Context.RootContext) => {
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
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const settingName = this.expressionGetter.visit(ctx.settingId()) as Parser.Identifier;
        const settingValue = this.expressionGetter.visit(ctx.settingValue()) as Parser.Constant;

        const node: Parser.SettingAssignment = {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        };

        if (ctx.expression() !== null) {
            node.condition = this.expressionGetter.visit(ctx.expression()!)!;
        }

        this.nodes.push(this.sourceMap.addLocation(node, ctx));
    }

    visitConditionBlock = (ctx: Context.ConditionBlockContext) => {
        this.nodes.push({
            type: "ConditionPush",
            condition: this.expressionGetter.visit(ctx.expression())!
        });

        try {
            ctx.settingStatement().forEach(s => this.visit(s));
        }
        finally {
            this.nodes.push({
                type: "ConditionPop",
            });
        }
    }

    visitTrigger = (ctx: Context.TriggerContext) => {
        const node: Parser.Trigger = {
            type: "Trigger",
            condition: this.triggerGetter.visit(ctx.triggerCondition())!,
            actions: [this.triggerGetter.visit(ctx.triggerAction())!]
        };

        this.nodes.push(this.sourceMap.addLocation(node, ctx));
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        const node: Parser.Trigger = {
            type: "Trigger",
            condition: this.triggerGetter.visit(ctx.triggerCondition())!,
            actions: ctx.triggerAction().map(c => this.triggerGetter.visit(c)!)
        };

        this.nodes.push(this.sourceMap.addLocation(node, ctx));
    }
}

export class ParserModel {
    sourceMap = new SourceMap();
    nodes: Parser.Node[] = [];
    errors: Parser.ParseError[] = [];

    update(source: string): boolean {
        this.reset();

        const parseTree = this.parse(source);
        if (this.errors.length !== 0) {
            return false;
        }

        const nodes = this.postProcess(parseTree);
        if (this.errors.length !== 0) {
            return false;
        }

        this.nodes = nodes;
        return true;
    }

    reset() {
        this.sourceMap = new SourceMap();
        this.nodes = [];
        this.errors = [];
    }

    private parse(source: string): Context.RootContext {
        const chars = CharStream.fromString(source);
        const lexer = new DSLLexer(chars);
        const tokens = new CommonTokenStream(lexer);
        const parser = new DSLParser(tokens);

        const errorStrategy = new ErrorStrategy();
        const errorListener = new ErrorListener(this.errors);
        lexer.removeErrorListeners();
        lexer.addErrorListener(errorListener);
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);
        parser.errorHandler = errorStrategy;

        return parser.root();
    }

    private postProcess(parseTree: Context.RootContext): Parser.Node[] {
        const nodes: Parser.Node[] = [];

        const visitor = new Visitor(this.sourceMap, nodes, this.errors);
        visitor.visit(parseTree);

        return nodes;
    }
}
