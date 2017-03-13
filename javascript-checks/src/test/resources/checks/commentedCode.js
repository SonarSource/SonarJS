function ok_jsdoc() {
/**
 * @return {String}
 */
}

function ok_linter_annotations() {

  /*jslint bitwise: false, browser: true, continue: false, devel: true, eqeq: false, evil: false, forin: false, newcap: false, nomen: false, plusplus: true, regexp: true, stupid: false, sub: false, undef: false, vars: false */

  /*jshint bitwise: false, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: false, nonew: true, plusplus: false, regexp: false, undef: true, strict: true, trailing: true, expr: true, regexdash: true, browser: true, jquery: true, onevar: true, nomen: true */

  /*global myGlobal: true */

}

function ok_text_containing_code_tokens() {

  // ====

  // ----

  // ++++

  // some text with semicolon at the end;

  // http://www.example.com/ = http://www.example.com/

  // labelName : id

  // foo(), bar();

  // continue

  // return blabla

  // break something

  // throw exception

  // throw exception;

  // labelName : id;


  //				break;
}

function ok_expression_without_semicolon() {
  // foo.bar

  // a + b

  // foo (see [123])

  // IE

  // shift

  // reduce
}

function ok_some_trivial_expressions() {

  //Object;

  //+ 10;

  //"gradientunscaled";
}

function noncompliant() {

  // Noncompliant@+2 {{Remove this commented out code.}}

  // if (something) {}


  // Noncompliant@+2

  // var object = {};


  // Noncompliant@+2

  // return foo().bar();


  // Noncompliant@+2

  // return foo().bar()


  // Noncompliant@+2

  // throw foo().bar()


  // Noncompliant@+2

  // // nested comment
  // foo(a, function(){
  //     doSmth();
  // });


  // Noncompliant@+2

  // foo();
  // bar();
}

function empty_comments() {

  //

  /* */

  //
  //  // nested comment
  //
}

function ok_code_with_text() {
  // some text with some code is ok
  // if (condition) {
  // }


  /*
   some text with some code is ok
   if (condition) {
   }
  */
}

function unfinished_block() {
   // Noncompliant@+2

   // if (condition) {
   //   while (condition) {
   //     doSomething();
}
