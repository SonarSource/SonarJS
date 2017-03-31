x = 1;
x = y;
  x = x; // Noncompliant {{Remove or correct this useless self-assignment.}}
//^^^^^
x = this.x;
this.x = this.x; // OK
a.b.x = a.b.x; // OK
x[i] = x[i]; // OK
x += x;
x = x + x;
