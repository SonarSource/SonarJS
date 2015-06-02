function fun1(){
  $( "p" ).hide(); // NOK
  $( "p" ).show();
}

function fun2(){
  $( "p" ).hide(); // NOK
  $( "p" ).show();
  $( "p" ).show();
}

function fun3(){
  $( "p" ).hide(); // NOK

  function fun4(){
    $( "p" ).hide(); // NOK
    $( "p" ).show();
  }

  $( "p" ).show();

}

$( "p" ).hide(); // NOK
$( "p" ).show();


var fun5 = function(){
  $( "p" ).hide(); // NOK
  $( "p" ).show();
}

var fun6 = function(){
  p = jQuery( "p" ); // ok
  jQuery( "p" ).show();
}

var fun7 = function(){
  var p = $( "p" ); // ok
  $( "p" ).show();
}

fun8(function(){
  jQuery( "p" ).hide(); // NOK
  jQuery( "p" ).show();
})

function fun9(){
  fun10(()=>{
    $( "p" ).hide(); // ok
  })
  fun11(()=>{
    $( "p" ).hide();
  })
}


// Creation of elements
function fun10(){
  $("<div>");  // OK
  $("<div>");

  $('<div/>');  // OK
  $('<div/>');

  jQuery('<p>Hello</p>');  // OK
  jQuery('<p>Hello</p>');
}