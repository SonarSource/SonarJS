function fun1(){
  $( "p" ).hide(); // Noncompliant [[secondary=+2]] {{Selection "$( "p" )" is made 2 times. It should be stored in a variable and reused.}}
//^^^^^^^^
  $( "p" ).show();
}

function fun2(){
  $( "p" ).hide(); // Noncompliant [[secondary=+1,+2]] {{Selection "$( "p" )" is made 3 times. It should be stored in a variable and reused.}}
  $( "p" ).show();
  $( "p" ).show();
}

function fun3(){
  $( "p" ).hide(); // Noncompliant

  function fun4(){
    $( "p" ).hide(); // Noncompliant
    $( "p" ).show();
  }

  $( "p" ).show();

}

$( "p" ).hide(); // Noncompliant
$( "p" ).show();


var fun5 = function(){
  $( "p" ).hide(); // Noncompliant
  $( "p" ).show();
}

var fun6 = function(){
  p = jQuery( "p" ); // ok
  jQuery( "p" ).show();
}

var fun7 = function(){
  var p = $( "p" ); // ok
  $( "p" ).show(); // Noncompliant [[secondary=+1]]
  $( "p" ).show();
}

fun8(function(){
  jQuery( "p" ).hide(); // Noncompliant
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
