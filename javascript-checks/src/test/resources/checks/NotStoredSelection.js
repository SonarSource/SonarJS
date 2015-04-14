function fun1(){
  $( "p" ).hide();
  $( "p" ).show();
}

function fun2(){
  $( "p" ).hide();
  $( "p" ).show();
  $( "p" ).show();
}

function fun3(){
  $( "p" ).hide();

  function fun4(){
    $( "p" ).hide();
    $( "p" ).show();
  }

  $( "p" ).show();

}

$( "p" ).hide();
$( "p" ).show();


var fun5 = function(){
  $( "p" ).hide();
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
  jQuery( "p" ).hide();
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