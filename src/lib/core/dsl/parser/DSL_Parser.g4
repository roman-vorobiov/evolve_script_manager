parser grammar DSL_Parser;

options {
    tokenVocab = DSL_Lexer;
}

// Statements

root
    : (statements | EOL)* EOF
    ;

statements
    : statement (EOL statement)*
    ;

statement
    : definitionStatement
    | importStatement
    | settingStatement
    | callStatement
    | loopStatement
    | triggerStatement
    ;

callStatement
    : identifier '(' (listItem (',' listItem)*)? ')'
    ;

loopStatement
    : 'for' identifier 'in' (listExpression | identifier) 'do' EOL (statement? EOL)* 'end'
    ;

// Definitions

definitionStatement
    : expressionDefinition
    | statementDefinition
    ;

expressionDefinition
    : 'def' identifier ('[' placeholder ']')? '=' (expression | listExpression)
    ;

statementDefinition
    : 'def' identifier '(' (listItem (',' listItem)*)? ')' 'begin' EOL (statement? EOL)* 'end'
    ;

// Import

importStatement
    : 'use' stringLiteral
    ;

// Settings

settingStatement
    : settingAssignment
    | settingShift
    | conditionBlock
    ;

conditionBlock
    : 'if' expression 'then' EOL (statement? EOL)* 'end'
    ;

settingAssignment
    : settingId '=' settingValue ('if' expression)?
    ;

settingId
    : identifier
    | subscriptExpression
    ;

settingValue
    : expression
    ;

settingShift
    : identifier op=('<<' | '>>') (listItem | listExpression) ('if' expression)?
    ;

// Triggers

triggerStatement
    : trigger
    | triggerChain
    ;

trigger
    : triggerAction 'when' triggerRequirement
    ;

triggerChain
    : 'when' triggerRequirement 'do' EOL (triggerAction? EOL)* 'end'
    ;

triggerAction
    : triggerActionOrCondition
    ;

triggerRequirement
    : triggerActionOrCondition
    ;

triggerActionOrCondition
    : identifier identifier ('(' numberLiteral ')')?
    ;

// Expressions

expression
    : op=NOT expression
    | expression op=(MUL | DIV) expression
    | expression op=(PLUS | MINUS) expression
    | expression op=(LT | LE | GT | GE) expression
    | expression op=(EQ | NEQ) expression
    | expression op=AND expression
    | expression op=OR expression
    | '(' expression ')'
    | unaryExpression
    ;

unaryExpression
    : identifier
    | subscriptExpression
    | literal
    ;

// Lists

listExpression
    : '[' EOL* listItem (',' EOL* listItem)* EOL* ']'
    ;

listContents
    : listItem (',' listItem)+
    | listItem (',' listItem)* fold=(AND | OR) listItem
    ;

listItem
    : identifier
    | stringLiteral
    | subscriptExpression
    ;

// Identifiers

identifier
    : Identifier
    ;

subscriptExpression
    : identifier '.' identifier
    | identifier '[' (conjunction='all of' | disjunction='any of')? subscript ']'
    ;

subscript
    : identifier
    | listContents
    | placeholder
    | wildcard
    | subscriptExpression
    ;

placeholder
    : Ellipsis
    ;

wildcard
    : MUL
    ;

// Literals

literal
    : constantLiteral
    | evalLiteral
    ;

evalLiteral
    : BigEval
    | SmallEval
    ;

constantLiteral
    : booleanLiteral
    | stringLiteral
    | numberLiteral
    ;

booleanLiteral
    : ON
    | OFF
    ;

stringLiteral
    : String
    ;

numberLiteral
    : Number
    ;
