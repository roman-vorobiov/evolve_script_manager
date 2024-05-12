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
    : settingStatement
    | triggerStatement
    ;

settingStatement
    : settingAssignment
    | conditionBlock
    ;

triggerStatement
    : trigger
    | triggerChain
    ;

// Settings

conditionBlock
    : 'if' expression 'then' EOL (settingStatement? EOL)* 'end'
    ;

settingAssignment
    : settingId '=' settingValue ('if' expression)?
    ;

settingId
    : identifier
    ;

settingValue
    : expression
    ;

// Triggers

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
    | OpeningParen expression ClosingParen
    | unaryExpression
    ;

unaryExpression
    : identifier
    | eval
    | value
    ;

identifier
    : Identifier ('.' Identifier)?
    | Identifier '[' Identifier (',' Identifier)* ']'
    | Identifier '[' Identifier (',' Identifier)* 'and' Identifier ']'
    | Identifier '[' Identifier (',' Identifier)* 'or' Identifier ']'
    | Identifier '[' Ellipsis ']'
    | Identifier '[' MUL ']'
    ;

eval
    : BigEval
    | SmallEval
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
    : String
    ;

numericValue
    : Number
    ;
