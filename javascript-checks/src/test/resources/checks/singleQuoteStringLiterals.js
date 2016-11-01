function sayHello() {
  alert("Hello World!"); // Noncompliant {{Replace double quotes by simple quote}}
//      ^^^^^^^^^^^^^^
  alert('Hello World!'); // OK
}

// ignore JSX attributes
<foo attr="string"/>;    // OK
<foo attr={"string"}/>;  // Noncompliant

alert("Don't do it"); // ok, contains a single quote
