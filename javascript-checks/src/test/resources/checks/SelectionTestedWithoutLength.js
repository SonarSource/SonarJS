if ($("p")){   // Noncompliant {{Use the "length" property to see whether this selection contains elements.}}
//  ^^^^^^
}

if ($("p").length){

}

if ($("p").length > 0){

}

if (jQuery("#id")){} // Noncompliant

var x = $("#id")

if (x) { } // Noncompliant
