function foo(){
  document.body.innerText = "Hello World!"; // NOK
  document.getElementById().innerText = "Hello World!"; // NOK
  document.forms["id"].innerText = "Hello World!"; // NOK

  var element1 = document.getElementById();
  element1.innerText = "Hello World!"; // NOK

  var element2 = document.getElementById();
  element2.innerText = "Hello World!"; // NOK
}