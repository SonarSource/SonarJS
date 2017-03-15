  for(;condition;) {                // Noncompliant {{Replace this "for" loop with a "while" loop}}
//^^^
}

for(;;) {                         // OK
}

for(var i = 0; condition;) {      // OK
}

for(var i = 0; condition; i++) {  // OK
}

for(var i = 0;; i++) {            // OK
}

for (i; condition; ) {            // OK
}

for ( ; i < length; i++ ) {}
