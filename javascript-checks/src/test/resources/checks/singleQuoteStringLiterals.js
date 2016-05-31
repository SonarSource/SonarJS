function sayHello() {
  alert("Hello World!"); // Noncompliant {{Replace double quotes by simple quote}}
//      ^^^^^^^^^^^^^^
  alert('Hello World!'); // OK
}

// ignore JSX attributes
<foo attr="string"/>;    // OK
<foo attr={"string"}/>;  // Noncompliant
