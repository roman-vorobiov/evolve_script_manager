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
    : settingAssignment
    | trigger
    | triggerChain
    ;

// Settings

settingAssignment
    : identifier '=' value ('if' expression)?
    ;

// Triggers

trigger
    : triggerAction 'when' triggerCondition
    ;

triggerChain
    : 'when' triggerCondition 'do' EOL (triggerAction EOL)* 'end'
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
    | OpeningParen expression ClosingParen
    | unaryExpression
    ;

unaryExpression
    : identifier
    | value
    ;

identifier
    : Identifier ('.' Identifier)?
    ;

// Values

value
    : booleanValue
    | stringValue
    | numericValue
    ;

booleanValue
    : ON
    | OFF
    ;

stringValue
    : Identifier
    ;

numericValue
    : Number
    ;
