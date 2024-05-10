lexer grammar DSL_Lexer;

// Characters

Dot           : '.';

OpeningParen  : '(';
ClosingParen  : ')';
OpeningBrace  : '{' | '{{';
ClosingBrace  : '}' | '}}';

Assignment    : '=';

MUL           : '*';
DIV           : '/';
PLUS          : '+';
MINUS         : '-';

EQ            : '==';
NEQ           : '!=';
LT            : '<';
LE            : '<=';
GT            : '>';
GE            : '>=';
AND           : 'and';
OR            : 'or';
NOT           : 'not';

// Identifiers

If   : 'if';
Then : 'then';
When : 'when';
Do   : 'do';
End  : 'end';
ON   : 'ON';
OFF  : 'OFF';

Identifier: [a-zA-Z] [a-zA-Z\-_0-9]*;

Number: '-'? ('0' | [1-9] [0-9]*) ('.' [0-9]+)?;

String: '"' ~["\\\r\n]* '"';

BigEval   : '{{' .*? '}}';
SmallEval : '{' .*? '}';

// Misc

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> channel(HIDDEN);

EOL: [\r\n];