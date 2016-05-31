var i = 0; // OK
i = 00; // OK
i = 0644; // Noncompliant {{Replace the value of the octal number (0644) by its decimal equivalent (420).}}
//  ^^^^
i = 420; // OK
i = 0.1; // OK
i = 1e-1; // OK
i = 0x1; // OK
i = 019  // OK

i = 001 // OK
