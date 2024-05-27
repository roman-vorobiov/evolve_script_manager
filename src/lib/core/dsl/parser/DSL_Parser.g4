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
    : commonStatement
    | triggerStatement
    ;

commonStatement
    : definitionStatement
    | settingStatement
    | callStatement
    | loopStatement
    ;

callStatement
    : identifier '(' listItem* ')'
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

// Settings

settingStatement
    : settingAssignment
    | settingShift
    | conditionBlock
    ;

conditionBlock
    : 'if' expression 'then' EOL (commonStatement? EOL)* 'end'
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
    : triggerAction 'when' triggerCondition
    ;

triggerChain
    : 'when' triggerCondition 'do' EOL (triggerAction? EOL)* 'end'
    ;

triggerAction
    : triggerActionOrCondition
    ;

triggerCondition
    : triggerActionOrCondition
    ;

triggerActionOrCondition
    : Identifier Identifier ('(' Number ')')?
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
    : '[' EOL* listItem (',' EOL* listItem)+ EOL* ']'
    ;

listContents
    : listItem (',' listItem)+
    | listItem (',' listItem)* fold=(AND | OR) listItem
    ;

listItem
    : identifier
    | constantLiteral
    | subscriptExpression
    ;

// Identifiers

identifier
    : Identifier
    ;

subscriptExpression
    : Identifier '.' identifier
    | Identifier '[' (conjunction='all of' | disjunction='any of')? subscript ']'
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
