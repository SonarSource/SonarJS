$.boxModel  // Noncompliant {{Remove this use of "boxModel", which is deprecated.}}

jQuery.sub()  // Noncompliant {{Remove this use of "sub()", which is deprecated.}}
//     ^^^

$("p").context  // Noncompliant {{Remove this use of "context", which is deprecated.}}
//     ^^^^^^^

$("p").andSelf()  // Noncompliant {{Remove this use of "andSelf()", which is deprecated.}}

$("p").prev(arg).andSelf()  // FN Noncompliant

$("p").next().context  // FN Noncompliant

someObj.sub() // OK

$(this)
  .toggleClass('collapsed')
  .andSelf();          // FN Noncompliant
