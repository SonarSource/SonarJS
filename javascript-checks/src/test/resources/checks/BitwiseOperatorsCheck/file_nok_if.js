if (a & b) { // Noncompliant {{Review this use of bitwise "&" operator; conditional "&&" might have been intended.}}
//    ^
}

a = x && y;
