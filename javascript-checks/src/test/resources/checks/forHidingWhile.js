for(;condition;) {                // NOK
}

for(;;) {                         // NOK
}

for(var i = 0; condition;) {      // OK
}

for(var i = 0; condition; i++) {  // OK
}

for(var i = 0;; i++) {            // OK
}
