$("#id *");  // Noncompliant {{Remove the use of this universal selector.}}

$("#id  > * ");  // Noncompliant

$("#id>*");  // Noncompliant

var x = $("div#id .className > *") // Noncompliant
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^

var $productIds = $("#products *:radio"); // OK

$productIds = $("*"); // OK

$("#id  > * ").length();  // Noncompliant
