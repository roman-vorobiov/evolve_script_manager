import { CharStream, CommonTokenStream } from "antlr4ng";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";
import { ErrorStrategy, ErrorListener } from "./errors";
import { SourceMap, type SourceEntity } from "./source";
import { ParseError } from "./model";

import type * as Context from "./.antlr/DSLParser";
import * as Parser from "./model";

function stringContents<T extends { getText(): string }>(token: T | null, quoteLength: number = 1): string | undefined {
    return token?.getText().slice(quoteLength, -quoteLength);
}

class NodeFactory {
    constructor(private sourceMap: SourceMap) {}

    private trackLocation<T extends object>(node: T, context: SourceEntity): T {
        this.sourceMap.addLocation(node, context);
        return node;
    }

    symbol(type: Parser.Symbol["type"], context: SourceEntity): Parser.Symbol {
        return this.trackLocation({ type }, context);
    }

    identifier(value: string, context: SourceEntity): Parser.Identifier {
        return this.trackLocation({ type: "Identifier", value }, context);
    }

    boolean(value: boolean, context: SourceEntity): Parser.BooleanLiteral {
        return this.trackLocation({ type: "Boolean", value }, context);
    }

    number(value: number, context: SourceEntity): Parser.NumberLiteral {
        return this.trackLocation({ type: "Number", value }, context);
    }

    string(value: string, context: SourceEntity): Parser.StringLiteral {
        return this.trackLocation({ type: "String", value }, context);
    }

    eval(value: string, context: SourceEntity): Parser.EvalLiteral {
        return this.trackLocation({ type: "Eval", value }, context);
    }

    expression(operator: string, args: Parser.Expression[], context: SourceEntity): Parser.CompoundExpression {
        return this.trackLocation({ type: "Expression", operator, args }, context);
    }

    subscript(base: Parser.Subscript["base"], key: Parser.Subscript["key"], context: SourceEntity): Parser.Subscript {
        return this.trackLocation({ type: "Subscript", base, key }, context);
    }

    list(values: Parser.Expression[], fold: string | undefined, context: SourceEntity): Parser.List {
        return this.trackLocation({ type: "List", values, fold }, context);
    }
}

class ExpressionGetter extends DSLVisitor<any> {
    private nodeFactory: NodeFactory;

    constructor(sourceMap: SourceMap) {
        super();
        this.nodeFactory = new NodeFactory(sourceMap);
    }

    visitExpression = (ctx: Context.ExpressionContext): Parser.Expression => {
        if (ctx._op) {
            const args = ctx.expression().map(expr => this.visit(expr)!);
            return this.nodeFactory.expression(ctx._op.text!, args, ctx);
        }
        else {
            const expression = (ctx.unaryExpression() || ctx.expression(0))!;
            return this.visit(expression)!;
        }
    }

    visitIdentifier = (ctx: Context.IdentifierContext): Parser.Identifier => {
        return this.nodeFactory.identifier(ctx.Identifier().getText(), ctx.Identifier().getSymbol());
    }

    visitSubscriptExpression = (ctx: Context.SubscriptExpressionContext): Parser.Subscript => {
        const base = ctx.Identifier()!;
        const baseNode = this.nodeFactory.identifier(base.getText(), base.getSymbol());

        const subscript = ctx.identifier() ?? ctx.subscript();
        const subscriptNode = this.visit(subscript!)!;

        return this.nodeFactory.subscript(baseNode, subscriptNode, ctx);
    }

    visitWildcard = (ctx: Context.WildcardContext): Parser.Symbol => {
        return this.nodeFactory.symbol("Wildcard", ctx.MUL().getSymbol());
    }

    visitPlaceholder = (ctx: Context.PlaceholderContext): Parser.Symbol => {
        return this.nodeFactory.symbol("Placeholder", ctx.Ellipsis().getSymbol());
    }

    visitListContents = (ctx: Context.ListContentsContext): Parser.List => {
        const contents = ctx.listItem().map(id => this.visit(id)!);
        return this.nodeFactory.list(contents, ctx._fold?.text, ctx);
    }

    visitEvalLiteral = (ctx: Context.EvalLiteralContext): Parser.EvalLiteral => {
        const contents = stringContents(ctx.BigEval(), 2) ?? stringContents(ctx.SmallEval(), 1)!;
        return this.nodeFactory.eval(contents.trim(), ctx);
    }

    visitStringLiteral = (ctx: Context.StringLiteralContext): Parser.StringLiteral => {
        return this.nodeFactory.string(stringContents(ctx)!, ctx);
    }

    visitBooleanLiteral = (ctx: Context.BooleanLiteralContext): Parser.BooleanLiteral => {
        return this.nodeFactory.boolean(ctx.getText() === "ON", ctx);
    }

    visitNumberLiteral = (ctx: Context.NumberLiteralContext): Parser.NumberLiteral => {
        return this.nodeFactory.number(Number(ctx.getText()), ctx);
    }
}

class TriggerGetter extends DSLVisitor<Parser.TriggerArgument> {
    private nodeFactory: NodeFactory;

    constructor(sourceMap: SourceMap) {
        super();
        this.nodeFactory = new NodeFactory(sourceMap);
    }

    visitTriggerActionOrCondition = (ctx: Context.TriggerActionOrConditionContext): Parser.TriggerArgument => {
        const [type, id] = ctx.Identifier();
        const count = ctx.Number();

        let node: Parser.TriggerArgument = {
            type: this.nodeFactory.identifier(type.getText(), type.getSymbol()),
            id: this.nodeFactory.identifier(id.getText(), id.getSymbol())
        };

        if (count !== null) {
            node.count = this.nodeFactory.number(Number(count.getText()), count.getSymbol());
        }

        return node;
    }
}

class Visitor extends DSLVisitor<void> {
    private sourceMap: SourceMap;
    private expressionGetter: ExpressionGetter;
    private triggerGetter: TriggerGetter;

    private nodes: Parser.Statement[];
    private errors: Parser.ParseError[];

    constructor(sourceMap: SourceMap, nodes: Parser.Statement[], errors: Parser.ParseError[]) {
        super();
        this.sourceMap = sourceMap;
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
        const settingName = this.expressionGetter.visit(ctx.settingId())!;
        const settingValue = this.expressionGetter.visit(ctx.settingValue())!;

        const node: Parser.SettingAssignment = {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        };

        if (ctx.expression() !== null) {
            node.condition = this.expressionGetter.visit(ctx.expression()!)!;
        }

        this.sourceMap.addLocation(node, ctx);
        this.nodes.push(node);
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

        this.sourceMap.addLocation(node, ctx);
        this.nodes.push(node);
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        const node: Parser.Trigger = {
            type: "Trigger",
            condition: this.triggerGetter.visit(ctx.triggerCondition())!,
            actions: ctx.triggerAction().map(c => this.triggerGetter.visit(c)!)
        };

        this.sourceMap.addLocation(node, ctx);
        this.nodes.push(node);
    }
}

export class ParserModel {
    sourceMap = new SourceMap();
    nodes: Parser.Statement[] = [];
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

    private postProcess(parseTree: Context.RootContext): Parser.Statement[] {
        const nodes: Parser.Statement[] = [];

        const visitor = new Visitor(this.sourceMap, nodes, this.errors);
        visitor.visit(parseTree);

        return nodes;
    }
}
