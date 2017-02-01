function sayHello() {
// Noncompliant@+1
// Noncompliant@+1 {{Avoid TODO}}
  // TODO implement me
  //
  // TODT should not raise issue

  // Note that for multiline comment we raise issue on the first line
  // Noncompliant@+1
  /*
  TODO
  */
}
