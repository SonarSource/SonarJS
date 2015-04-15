$("#id div.className");  // NOK

$("#id  .className[attr='value']");  // NOK

var x = $("div#id .className") // OK

var $productIds = $("#products div.id"); // NOK

$productIds = $("#products div.id #id"); // OK - more than 2 levels
