var sym = new Symbol(123);   // FN, as know that built-in "Symbol" is written by user, but we don't know that it happens after this line

Symbol = Number;

var sym = new Symbol(123);   // OK
