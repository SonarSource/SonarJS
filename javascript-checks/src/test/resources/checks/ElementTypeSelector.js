$(":radio");  // NOK

$("input:checkbox");  // NOK

var x = $("form input:file") // NOK

$("div.className :image div.className");  // NOK

$("input:password"); // NOK

var $s = jQuery("div :reset")  // NOK

$("input:text"); // NOK

$("input:Text"); // NOK

foo("input:text"); // OK

jQuery("[type=text]"); // OK

$("input[type='radio']");  // OK

$("input:text", context); // NOK

