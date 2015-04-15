$("#id *");  // NOK

$("#id  > * ");  // NOK

$("#id>*");  // NOK

var x = $("div#id .className > *") // NOK

var $productIds = $("#products *:radio"); // OK

$productIds = $("*"); // OK
