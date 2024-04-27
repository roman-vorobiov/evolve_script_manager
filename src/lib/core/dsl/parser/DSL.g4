grammar DSL;

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
    ;

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

Colon: ':';

OpeningBrace: '{';

ClosingBrace: '}';

Operator: '=';

ON: 'ON';

OFF: 'OFF';

Identifier: [a-zA-Z]+;

Number: '-'? ('0' | [1-9] [0-9]*) ('.' [0-9]+)?;

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> channel(HIDDEN);

EOL: [\r\n];
