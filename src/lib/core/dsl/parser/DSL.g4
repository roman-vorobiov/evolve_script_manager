grammar DSL;

root
    : statement+
    | (EOL | Whitespace)* EOF
    ;

statement
    : expression (EOL+ | EOF | ';')
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
    ;

booleanValue
    : 'ON'
    | 'OFF'
    ;

stringValue
    : Identifier
    ;

Brace
    : '{'
    | '}'
    ;

Operator
    : '='
    ;

Identifier
    : [a-zA-Z]+
    ;

Whitespace
    : ' '+ -> skip
    ;

EOL
    : '\n'
    ;
