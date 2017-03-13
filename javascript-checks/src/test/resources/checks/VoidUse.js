  void function(){ // Noncompliant {{Remove "void" operator}}
//^^^^
}();

foo(void 42); // Noncompliant

// void 0 is ok
void(0);
void 0;
