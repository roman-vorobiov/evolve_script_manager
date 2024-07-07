parser grammar DSL_Parser;

options {
    tokenVocab = DSL_Lexer;
}

// Statements

root
    : lines EOF
    ;

lines
    : line (EOL line)*
    ;

line
    : statement?
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
    : identifier '(' EOL* listContents? EOL* ')'
    ;

loopStatement
    : 'for' identifier 'in' (listExpression | identifier) 'do' EOL (statement? EOL)* 'end'
    ;

importStatement
    : 'use' stringLiteral
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
    : 'def' identifier '(' (EOL* definitionParameters)? EOL* ')' 'begin' EOL (statement? EOL)* 'end'
    ;

definitionParameters
    : identifier (EOL* ',' EOL* identifier)*
    ;

// Settings

settingStatement
    : settingAssignment
    | settingShift
    | settingShiftBlock
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

settingShiftBlock
    : identifier '<<' 'begin' EOL (statement? EOL)* 'end'
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
    : identifier identifier ('(' (numberLiteral | identifier) ')')?
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
    | nullaryExpression
    | '(' expression ')'
    ;

nullaryExpression
    : identifier
    | literal
    | subscriptExpression
    | listExpression
    | prefixedFoldExpression
    ;

// Lists

foldExpression
    : prefixedFoldExpression
    | foldedListContents
    ;

prefixedFoldExpression
    : (conjunction='all of' | disjunction='any of') (identifier | listExpression)
    ;

foldedListContents
    : listItem (EOL* ',' EOL* listItem)* EOL* fold=(AND | OR) listItem
    ;

listContents
    : listItem (EOL* ',' EOL* listItem)*
    ;

listExpression
    : '[' EOL* listContents? EOL* ']'
    ;

listItem
    : nullaryExpression
    ;

// Identifiers

identifier
    : Identifier
    ;

subscriptExpression
    : identifier '.' identifier
    | identifier '[' EOL* subscript EOL* ']'
    ;

subscript
    : identifier
    | subscriptExpression
    | foldExpression
    | listContents
    | placeholder
    | wildcard
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
