
class _MyClass { // Compliant

}

class __MyClass { // Noncompliant {{Rename class "__MyClass" to match the regular expression ^[_A-Z][a-zA-Z0-9]*$.}}
//    ^^^^^^^^^

}

