/**
 * @return {String}
 */
function sayHello() {

  // Noncompliant@+1 {{Remove this commented out code.}}
  // if (something) {
//^^^^^^^^^^^^^^^^^^^

  // OK
  // ====
  // ----
  // ++++

  // OK
  // http://www.example.com/ = http://www.example.com/

  // OK
  /*jslint bitwise: false, browser: true, continue: false, devel: true, eqeq: false, evil: false, forin: false, newcap: false, nomen: false, plusplus: true, regexp: true, stupid: false, sub: false, undef: false, vars: false */
  /*jshint bitwise: false, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: false, nonew: true, plusplus: false, regexp: false, undef: true, strict: true, trailing: true, expr: true, regexdash: true, browser: true, jquery: true, onevar: true, nomen: true */
  /*global myGlobal: true */

  // OK
  // some text with semicolon at the end;

  // Noncompliant@+1
  // var object = {};

  // OK
  // foo.bar
  // a + b
  // foo (see [123])
  // labelName : id
  // foo(), bar();
  // continue
  // return blabla
  // break something
  // throw exception
  // throw exception;
  // labelName : id;

  // Noncompliant@+1
  // return foo().bar();
  // Noncompliant@+1
  // return foo().bar()
  // Noncompliant@+1
  // throw foo().bar()

  // OK empty comment
  //
  /* */
}
