$("div.className");  // Noncompliant {{Remove "div" in this selector.}}

$(".className");  // OK

var x = $("div#id"); // OK

$("div.className div.className");  // OK

$(":contains('text').className"); // OK

var $s = jQuery(" p.class-name ");  // Noncompliant {{Remove "p" in this selector.}}
//       ^^^^^^^^^^^^^^^^^^^^^^^^

foo("div.className"); // OK

$("div.className", "#id");  // OK

