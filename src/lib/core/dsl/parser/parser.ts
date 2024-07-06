import { CharStream, CommonTokenStream } from "antlr4ng";
import { DSLLexer } from "./.antlr/DSLLexer";
import { DSLParser } from "./.antlr/DSLParser";
import { DSLVisitor } from "./.antlr/DSLVisitor";
import { ErrorStrategy, ErrorListener } from "./errors";
import { SourceMap, locationOf } from "./source";
import { ParseError } from "../model";

import type * as Context from "./.antlr/DSLParser";
import type { SourceEntity, SourceLocation } from "./source";
import type { Initial as Parser } from "../model";

function stringContents<T extends { getText(): string }>(token: T | null, quoteLength: number = 1): string | undefined {
    return token?.getText().slice(quoteLength, -quoteLength);
}

class NodeFactory {
    constructor(private sourceMap: SourceMap, private currentFile: string) {}

    private trackLocation<T extends object>(node: T, context: SourceEntity): T {
        this.sourceMap.addLocation(node, context, this.currentFile);
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

    list(values: Parser.Expression[], context: SourceEntity): Parser.List {
        return this.trackLocation({ type: "List", values }, context);
    }

    fold(arg: Parser.List | Parser.Identifier, operator: string, context: SourceEntity): Parser.FoldExpression {
        return this.trackLocation({ type: "Fold", arg, operator }, context);
    }
}

class ExpressionGetter extends DSLVisitor<any> {
    private nodeFactory: NodeFactory;

    constructor(sourceMap: SourceMap, currentFile: string) {
        super();
        this.nodeFactory = new NodeFactory(sourceMap, currentFile);
    }

    visitExpression = (ctx: Context.ExpressionContext): Parser.Expression => {
        if (ctx._op) {
            const args = ctx.expression().map(expr => this.visit(expr)!);
            return this.nodeFactory.expression(ctx._op.text!, args, ctx);
        }
        else {
            const expression = ctx.nullaryExpression() ?? ctx.expression(0)!;
            return this.visit(expression)!;
        }
    }

    visitIdentifier = (ctx: Context.IdentifierContext): Parser.Identifier => {
        return this.nodeFactory.identifier(ctx.Identifier().getText(), ctx.Identifier().getSymbol());
    }

    visitSubscriptExpression = (ctx: Context.SubscriptExpressionContext): Parser.Subscript => {
        const baseNode = this.visit(ctx.identifier(0)!);

        const subscript = ctx.identifier(1) ?? ctx.subscript()!;
        const subscriptNode = this.visit(subscript);

        return this.nodeFactory.subscript(baseNode, subscriptNode, ctx);
    }

    visitWildcard = (ctx: Context.WildcardContext): Parser.Symbol => {
        return this.nodeFactory.symbol("Wildcard", ctx.MUL().getSymbol());
    }

    visitPlaceholder = (ctx: Context.PlaceholderContext): Parser.Symbol => {
        return this.nodeFactory.symbol("Placeholder", ctx.Ellipsis().getSymbol());
    }

    visitListExpression = (ctx: Context.ListExpressionContext) => {
        const contents = ctx.listContents();

        if (contents !== null) {
            return this.nodeFactory.list(contents.listItem().map(id => this.visit(id)!), ctx);
        }
        else {
            return this.nodeFactory.list([], ctx);
        }
    }

    visitListContents = (ctx: Context.ListContentsContext): Parser.List => {
        const contents = ctx.listItem().map(id => this.visit(id)!);
        return this.nodeFactory.list(contents, ctx);
    }

    visitFoldedListContents = (ctx: Context.FoldedListContentsContext) => {
        const contents = ctx.listItem().map(id => this.visit(id)!);
        const arg = this.nodeFactory.list(contents, ctx);
        const operator = ctx._fold!.text!;
        return this.nodeFactory.fold(arg, operator, ctx);
    }

    visitPrefixedFoldExpression = (ctx: Context.PrefixedFoldExpressionContext) => {
        const arg = this.visit(ctx.identifier() ?? ctx.listExpression()!);
        const operator = ctx._conjunction ? "and" : "or";
        return this.nodeFactory.fold(arg, operator, ctx);
    }

    visitDefinitionParameters = (ctx: Context.DefinitionParametersContext) => {
        const contents = ctx.identifier().map(id => this.visit(id));
        return this.nodeFactory.list(contents, ctx);
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
    private currentFile: string;
    private sourceMap: SourceMap;
    private expressionGetter: ExpressionGetter;

    constructor(sourceMap: SourceMap, currentFile: string) {
        super();
        this.currentFile = currentFile;
        this.sourceMap = sourceMap;
        this.expressionGetter = new ExpressionGetter(sourceMap, currentFile);
    }

    visitTriggerActionOrCondition = (ctx: Context.TriggerActionOrConditionContext): Parser.TriggerArgument => {
        const type = ctx.identifier(0)!;
        const id = ctx.identifier(1)!;
        const count = ctx.numberLiteral() ?? ctx.identifier(2);

        let node: Parser.TriggerArgument = {
            type: this.expressionGetter.visit(type),
            id: this.expressionGetter.visit(id)
        };

        if (count !== null) {
            node.count = this.expressionGetter.visit(count);
        }

        this.sourceMap.addLocation(node, ctx, this.currentFile);
        return node;
    }
}

class Visitor extends DSLVisitor<void> {
    private sourceMap: SourceMap;
    private expressionGetter: ExpressionGetter;
    private triggerGetter: TriggerGetter;

    private nodes: Parser.Statement[];
    private errors: ParseError[];

    private model: Record<string, string>;
    private currentFile: string;
    private importStack: SourceLocation[];

    constructor(
        sourceMap: SourceMap,
        nodes: Parser.Statement[],
        errors: ParseError[],
        model: Record<string, string>,
        currentFile: string,
        importStack: SourceLocation[]
    ) {
        super();
        this.nodes = nodes;
        this.errors = errors;
        this.model = model;
        this.currentFile = currentFile;
        this.importStack = importStack;

        this.sourceMap = sourceMap;
        this.expressionGetter = new ExpressionGetter(sourceMap, this.currentFile);
        this.triggerGetter = new TriggerGetter(sourceMap, this.currentFile);
    }

    private addNode<T extends Parser.Statement>(ctx: SourceEntity, node: T) {
        this.sourceMap.addLocation(node, ctx, this.currentFile);
        this.nodes.push(node);

        return node;
    }

    private collectStatements(statementContexts: Context.StatementContext[]) {
        const innerScope: Parser.Statement[] = [];
        const outerScope = this.nodes;
        this.nodes = innerScope;

        try {
            statementContexts.forEach(s => this.visit(s));
        }
        finally {
            this.nodes = outerScope;
        }

        return innerScope;
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

    visitExpressionDefinition = (ctx: Context.ExpressionDefinitionContext) => {
        const name = this.expressionGetter.visit(ctx.identifier());
        const body = this.expressionGetter.visit(ctx.expression() ?? ctx.listExpression()!);

        this.addNode<Parser.ExpressionDefinition>(ctx, {
            type: "ExpressionDefinition",
            name,
            body,
            parameterized: ctx.placeholder() !== null
        });
    }

    visitSettingAssignment = (ctx: Context.SettingAssignmentContext) => {
        const settingName = this.expressionGetter.visit(ctx.settingId());
        const settingValue = this.expressionGetter.visit(ctx.settingValue());

        const node = this.addNode<Parser.SettingAssignment>(ctx, {
            type: "SettingAssignment",
            setting: settingName,
            value: settingValue
        });

        if (ctx.expression() !== null) {
            node.condition = this.expressionGetter.visit(ctx.expression()!);
        }
    }

    visitSettingShift = (ctx: Context.SettingShiftContext) => {
        const settingName = this.expressionGetter.visit(ctx.identifier());
        const operator = ctx._op!.text!;
        const value = this.expressionGetter.visit(ctx.listItem() ?? ctx.listExpression()!);

        const node = this.addNode<Parser.SettingShift>(ctx, {
            type: "SettingShift",
            setting: settingName,
            value,
            operator
        });

        if (ctx.expression() !== null) {
            node.condition = this.expressionGetter.visit(ctx.expression()!);
        }
    }

    visitSettingShiftBlock = (ctx: Context.SettingShiftBlockContext) => {
        const settingName = this.expressionGetter.visit(ctx.identifier());

        this.addNode<Parser.SettingShiftBlock>(ctx, {
            type: "SettingShiftBlock",
            setting: settingName,
            body: this.collectStatements(ctx.statement())
        });
    }

    visitStatementDefinition = (ctx: Context.StatementDefinitionContext) => {
        const name = this.expressionGetter.visit(ctx.identifier());
        const params = ctx.definitionParameters() ? this.expressionGetter.visit(ctx.definitionParameters()!).values : [];

        this.addNode<Parser.StatementDefinition>(ctx, {
            type: "StatementDefinition",
            name,
            params,
            body: this.collectStatements(ctx.statement())
        });
    }

    visitCallStatement = (ctx: Context.CallStatementContext) => {
        const name = this.expressionGetter.visit(ctx.identifier());
        const args = ctx.listContents() ? this.expressionGetter.visit(ctx.listContents()!).values : [];

        this.addNode<Parser.FunctionCall>(ctx, {
            type: "FunctionCall",
            name,
            args
        });
    }

    visitLoopStatement = (ctx: Context.LoopStatementContext) => {
        const iteratorName = this.expressionGetter.visit(ctx.identifier(0)!);
        const variable = ctx.identifier(1) && this.expressionGetter.visit(ctx.identifier(1)!);
        const list = ctx.listExpression() && this.expressionGetter.visit(ctx.listExpression()!);

        this.addNode<Parser.Loop>(ctx, {
            type: "Loop",
            iteratorName,
            values: variable ?? list,
            body: this.collectStatements(ctx.statement())
        });
    }

    visitConditionBlock = (ctx: Context.ConditionBlockContext) => {
        this.addNode<Parser.ConditionBlock>(ctx, {
            type: "ConditionBlock",
            condition: this.expressionGetter.visit(ctx.expression()),
            body: this.collectStatements(ctx.statement())
        });
    }

    visitTrigger = (ctx: Context.TriggerContext) => {
        this.addNode<Parser.Trigger>(ctx, {
            type: "Trigger",
            requirement: this.triggerGetter.visit(ctx.triggerRequirement())!,
            actions: [this.triggerGetter.visit(ctx.triggerAction())!]
        });
    }

    visitTriggerChain = (ctx: Context.TriggerChainContext) => {
        this.addNode<Parser.Trigger>(ctx, {
            type: "Trigger",
            requirement: this.triggerGetter.visit(ctx.triggerRequirement())!,
            actions: ctx.triggerAction().map(c => this.triggerGetter.visit(c)!)
        });
    }

    visitImportStatement = (ctx: Context.ImportStatementContext) => {
        const importTarget = stringContents(ctx.stringLiteral())!;

        const importLocation = locationOf(ctx, this.currentFile);

        if (this.importStack.find(l => l.file === importTarget) !== undefined || importTarget === this.currentFile) {
            throw new ParseError("Circular dependency detected", importLocation);
        }

        if (!(importTarget in this.model)) {
            throw new ParseError(`Could not find config '${importTarget}'`, locationOf(ctx.stringLiteral(), this.currentFile));
        }

        const importStack = [...this.importStack, importLocation];

        this.sourceMap.importStack = importStack;
        const { nodes, errors } = parseSourceImpl(this.model, importTarget, importStack, this.sourceMap);
        this.sourceMap.importStack = this.importStack;

        if (errors.length === 0) {
            nodes.forEach(n => this.nodes.push(n));
        }
        else {
            for (const e of errors) {
                if (e.importStack.length === 0) {
                    e.importStack = importStack;
                }

                this.errors.push(e);
            }
        }
    }
}

function prepareParser(file: string, source: string, errors: ParseError[]) {
    const chars = CharStream.fromString(source);
    const lexer = new DSLLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new DSLParser(tokens);

    const errorStrategy = new ErrorStrategy(file);
    const errorListener = new ErrorListener(file, errors);
    lexer.removeErrorListeners();
    lexer.addErrorListener(errorListener);
    parser.removeErrorListeners();
    parser.addErrorListener(errorListener);
    parser.errorHandler = errorStrategy;

    return parser;
}

export type ParseResult = {
    sourceMap: SourceMap,
    nodes: Parser.Statement[],
    errors: ParseError[],
}

function parseSourceImpl(model: Record<string, string>, target: string, importStack: SourceLocation[], sourceMap: SourceMap): ParseResult {
    const source = model[target];
    if (source === undefined) {
        throw new Error(`Invalid target '${target}'`);
    }

    const nodes: Parser.Statement[] = [];
    const errors: ParseError[] = [];

    const parser = prepareParser(target, source, errors);
    const root = parser.root();
    if (errors.length === 0) {
        const visitor = new Visitor(sourceMap, nodes, errors, model, target, importStack);
        visitor.visit(root);
    }

    return { sourceMap, nodes, errors };
}

export function parseSource(model: Record<string, string>, target: string): ParseResult {
    return parseSourceImpl(model, target, [], new SourceMap());
}

export function parseExpression(source: string): ParseResult {
    const sourceMap = new SourceMap();
    const errors: ParseError[] = [];

    const parser = prepareParser("source", source, errors);
    const root = parser.expression();
    if (errors.length !== 0) {
        return { sourceMap, nodes: [], errors };
    }

    try {
        const visitor = new ExpressionGetter(sourceMap, "source");
        const node = visitor.visit(root);

        return { sourceMap, nodes: [node], errors: [] };
    }
    catch (e) {
        if (e instanceof ParseError) {
            return { sourceMap, nodes: [], errors: [e] };
        }

        throw e;
    }
}
