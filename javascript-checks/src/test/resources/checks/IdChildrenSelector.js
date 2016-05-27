$("#id div.className");  // Noncompliant {{Move "div.className" into "find" method.}}

$("#id  .className[attr='value']");  // Noncompliant {{Move ".className[attr='value']" into "find" method.}}

var x = $("div#id .className") // OK

var $productIds = $("#products div.id"); // Noncompliant {{Move "div.id" into "find" method.}}
//                ^^^^^^^^^^^^^^^^^^^^^

$productIds = $("#products div.id #id"); // OK - more than 2 levels

if ($("#products div.id").length()) { } // Noncompliant {{Move "div.id" into "find" method.}}
