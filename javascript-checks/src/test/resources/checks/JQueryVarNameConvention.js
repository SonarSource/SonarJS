var name1 = $("#id"); // NOK

var $name1 = $("#id"); // OK

name2 = 1;

name2 = $("#id");    // NOK

var name3 = $("#id").next();  // NOK, but is not detected as it's selectors chain

function foo(name4){
  name4 = $("#id");    // OK - par is parameter
}

value = jQuery( option ).val();  // OK
