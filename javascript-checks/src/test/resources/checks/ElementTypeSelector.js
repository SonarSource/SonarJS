$(":radio");  // Noncompliant {{Use the "[type='radio']" selector here instead of ":radio".}}

$("input:checkbox");  // Noncompliant {{Use the "[type='checkbox']" selector here instead of ":checkbox".}}

var x = $("form input:file") // Noncompliant
//      ^^^^^^^^^^^^^^^^^^^^

$("div.className :image div.className");  // Noncompliant

$("input:password"); // Noncompliant

var $s = jQuery("div :reset")  // Noncompliant
//       ^^^^^^^^^^^^^^^^^^^^

$("input:text"); // Noncompliant

$("input:Text"); // Noncompliant {{Use the "[type='Text']" selector here instead of ":Text".}}

foo("input:text"); // OK

jQuery("[type=text]"); // OK

$("input[type='radio']");  // OK

$("input:text", context); // Noncompliant

$()   // OK
$(str)  // OK
