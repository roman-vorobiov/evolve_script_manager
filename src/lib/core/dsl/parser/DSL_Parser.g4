parser grammar DSL_Parser;

options {
    tokenVocab = DSL_Lexer;
}

// Statements

root
    : (statement | EOL)* EOF
    ;

statement
    : simpleStatements
    | compoundStatement
    ;

simpleStatements
    : simpleStatement (';' simpleStatement)* ';'? EOL
    ;

simpleStatement
    : settingAssignment
    | trigger
    ;

compoundStatement
    : triggerChain
    ;

// Settings

settingAssignment
    : setting '=' value
    ;

setting
    : '{' settingId '}'
    ;

settingId
    : simpleSettingId
    | compoundSettingId
    ;

simpleSettingId
    : Identifier
    ;

compoundSettingId
    : Identifier ':' Identifier
    ;

// Triggers

trigger
    : triggerAction 'when' triggerCondition
    ;

triggerChain
    : 'when' triggerCondition 'do' EOL (triggerAction EOL)* 'end'
    ;

triggerAction
    : '{' Identifier ':' Identifier '}'
    ;

triggerCondition
    : '{' Identifier ':' Identifier '}'
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
