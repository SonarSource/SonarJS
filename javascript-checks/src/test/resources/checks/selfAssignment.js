x = 1;
x = y;
x = x; // Noncompliant {{Remove or correct this useless self-assignment.}}
x = this.x;
  this.x = this.x; // Noncompliant
//^^^^^^^^^^^^^^^
x += x;
x = x + x;
