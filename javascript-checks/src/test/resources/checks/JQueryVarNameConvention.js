var name1 = $("#id"); // Noncompliant {{Rename variable "name1" to match the regular expression ^\$[a-z][a-zA-Z0-9]*$.}}

var $name1 = $("#id"); // OK

name2 = 1;

name2 = $("#id");    // OK, name2 has 2 types

var name3 = $("#id").next();  // NOK, but is not detected as it's selectors chain

function foo(name4){
  name4 = $("#id");    // name4 - par is parameter
}

value = jQuery( option ).val();  // OK

name5 = $("#id");    // Noncompliant [[sc=1;ec=6]]
