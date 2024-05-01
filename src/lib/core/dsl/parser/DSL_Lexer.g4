lexer grammar DSL_Lexer;

// Characters

Dot           : '.';

Semicolon     : ';';

OpeningBrace  : '(';
ClosingBrace  : ')';
OpeningCBrace : '{';
ClosingCBrace : '}';

Assignment    : '=';

// Identifiers

When : 'when';
Do   : 'do';
End  : 'end';
ON   : 'ON';
OFF  : 'OFF';

Identifier: [a-zA-Z] [a-zA-Z\-_0-9]*;

Number: '-'? ('0' | [1-9] [0-9]*) ('.' [0-9]+)?;

// Misc

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> channel(HIDDEN);

EOL: [\r\n];
