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
    : 'ON'
    | 'OFF'
    ;

stringValue
    : Identifier
    ;

numericValue
    : Number
    ;

Brace: '{' | '}';

Operator: '=';

Identifier: [a-zA-Z]+;

Number: '-'? (Integer | Float);

Float: Integer '.' [0-9]+;

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> skip;

EOL: [\r\n];

fragment Integer: '0' | [1-9] [0-9]*;
