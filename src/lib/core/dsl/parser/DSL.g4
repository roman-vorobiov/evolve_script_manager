grammar DSL;

// Statements

root
    : statement* EOF
    ;

statement
    : expression (EOF | EOL | ';') EOL*
    | ';' EOL*
    | EOL
    ;

expression
    : settingAssignment
    | trigger
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

// Lexer rules

Keyword: 'when';

Colon: ':';

OpeningBrace: '{';

ClosingBrace: '}';

Operator: '=';

ON: 'ON';

OFF: 'OFF';

Identifier: [a-zA-Z] [a-zA-Z\-_0-9]*;

Number: '-'? ('0' | [1-9] [0-9]*) ('.' [0-9]+)?;

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> channel(HIDDEN);

EOL: [\r\n];
