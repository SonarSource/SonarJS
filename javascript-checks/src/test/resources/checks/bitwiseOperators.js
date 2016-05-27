function sayHello() {
  a = 1 + 1; // OK
  a = ~1;     // Noncompliant
//    ^
  a = 1 | 1;   // Noncompliant
  a = 1 & 1;   // Noncompliant
  a = 1 << 1;   // Noncompliant
//      ^^
  a = 1 >> 1;   // Noncompliant
  a = 1 >>> 1;   // Noncompliant
  a <<= 1;   // Noncompliant
  a >>= 1;   // Noncompliant
  a >>>=1;   // Noncompliant
  a |= 1;   // Noncompliant
  a &= 1;   // Noncompliant
  a ^= 1;   // Noncompliant
  return foo()
     & foo()   // Noncompliant
}

