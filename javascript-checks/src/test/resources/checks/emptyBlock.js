if (something) { // Non-Compliant
}

if (something) { // Compliant
  doSomething();
}

for (var i = 0; i < length; i++) { // Non-Compliant
}

for (var i = 0; i < length; i++) { // Compliant
  doSomething();
}

function fun() { // Non-Compliant
}

function fun() { // Compliant
  doSomething();
}
