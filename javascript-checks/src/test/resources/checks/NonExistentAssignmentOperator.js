x = y;
x += y;
x =+ y; // Noncompliant {{Was "+=" meant instead?}}
//^^
x =! y; // Noncompliant {{Was "!=" meant instead?}}
//^^
x = + y;
x =
   + y;

x=+y; // ok, some people don't like white spaces, we cannot help them

x =- y; // Noncompliant {{Was "-=" meant instead?}}
x = - y;

x /=+ y;
