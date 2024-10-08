lexer grammar DSL_Lexer;

// Characters

Ellipsis      : '...';
Dot           : '.';
Comma         : ',';

OpeningParen  : '(';
ClosingParen  : ')';
OpeningBrace  : '{' | '{{';
ClosingBrace  : '}' | '}}';
OpeningBracket: '[';
ClosingBracket: ']';

Assignment    : '=';

MUL           : '*';
DIV           : '/';
PLUS          : '+';
MINUS         : '-';

SHIFTL        : '<<';
SHIFTR        : '>>';
EQ            : '==';
NEQ           : '!=';
LT            : '<';
LE            : '<=';
GT            : '>';
GE            : '>=';
AND           : 'and';
OR            : 'or';
NOT           : 'not';

// Keywords

Use   : 'use';
AnyOf : 'any of';
AllOf : 'all of';
Def   : 'def';
For   : 'for';
In    : 'in';
If    : 'if';
Then  : 'then';
Do    : 'do';
Begin : 'begin';
End   : 'end';
ON    : 'ON';
OFF   : 'OFF';

Identifier: '$'? [a-zA-Z] [a-zA-Z\-_0-9]*;

Number: '-'? ('0' | [1-9] [0-9]*) ('.' [0-9]+)?;

String: '"' ~["\\\r\n]* '"';

BigEval   : '{{' .*? '}}';
SmallEval : '{' .*? '}';

// Misc

Whitespace: ' '+ -> skip;

Comment: '#' ~[\r\n]* -> channel(HIDDEN);

EOL: [\r\n];
