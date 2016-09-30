  void function(){ // Noncompliant {{Remove "void" operator}}
//^^^^
}();

void(0); // Noncompliant
void 0; // Noncompliant

foo(void 42); // Noncompliant
