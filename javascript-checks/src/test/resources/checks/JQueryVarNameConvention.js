var name1 = $("#id"); // NOK

var $name1 = $("#id"); // OK

name2 = 1;

name2 = $("#id");    // OK, name2 has 2 types

var name3 = $("#id").next();  // NOK, but is not detected as it's selectors chain

function foo(name4){
  name4 = $("#id");    // name4 - par is parameter
}

value = jQuery( option ).val();  // OK

name5 = $("#id");    // NOK
