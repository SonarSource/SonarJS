var i = 0; // OK
i = 00; // OK
i = 0644; // NOK
i = 420; // OK
i = 0.1; // OK
i = 1e-1; // OK
i = 0x1; // OK
i = 019  // OK

i = 001 // OK