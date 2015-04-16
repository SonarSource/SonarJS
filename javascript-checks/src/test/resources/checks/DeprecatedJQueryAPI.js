$.boxModel  // NOK

jQuery.sub()  // NOK

$("p").context  // NOK

$("p").andSelf()  // NOK

$("p").prev(arg).andSelf()  // NOK

$("p").next().context  // NOK

someObj.sub() // OK

$(this)
  .toggleClass('collapsed')
  .andSelf()
