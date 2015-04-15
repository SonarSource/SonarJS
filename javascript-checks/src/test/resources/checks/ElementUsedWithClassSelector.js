$("div.className");  // NOK

$(".className");  // OK

var x = $("div#id") // OK

$("div.className div.className");  // OK

$(":contains('text').className"); // OK

var $s = jQuery(" p.class-name ")  // NOK
