grammar Vollch;

root
    : statement* EOF
    ;

statement
    : expression ';'
    ;

expression
    : settingAssignment
    ;

settingAssignment
    : setting '=' value
    ;

setting
    : '{' Identifier '}'
    ;

settingId
    : Identifier
    ;

value
    : booleanValue
    ;

booleanValue
    : 'ON'
    | 'OFF'
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
    : '\n'+ -> skip
    ;
