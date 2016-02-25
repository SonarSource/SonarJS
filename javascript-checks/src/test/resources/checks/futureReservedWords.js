var implements; // Noncompliant {{Rename "implements" identifier to prevent potential conflicts with future evolutions of the JavaScript language.}}
var interface; // Noncompliant [[sc=5;ec=14]] both
var public; // Noncompliant both
var static; // Noncompliant es5
var await;   // Noncompliant es6

var container = {
  implements: true // OK
}

implements = 3
