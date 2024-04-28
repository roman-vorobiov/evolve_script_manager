lexer grammar DSL_Lexer;

// Keywords

When : 'when';
Do   : 'do';
End  : 'end';
ON   : 'ON';
OFF  : 'OFF';

// Characters

Colon        : ':';
Semicolon    : ';';
OpeningBrace : '{';
ClosingBrace : '}';
Assignment   : '=';

// Identifiers

Identifier: [a-zA-Z] [a-zA-Z\-_0-9]*;

Number: '-'? ('0' | [1-9] [0-9]*) ('.' [0-9]+)?;

// Misc

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> channel(HIDDEN);

EOL: [\r\n];
