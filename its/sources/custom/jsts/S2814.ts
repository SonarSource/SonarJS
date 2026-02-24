var a = 3;
var a = 10; // Noncompliant

namespace X {
}
namespace X { // Compliant
}

class A {
}
namespace A { // Compliant
}
