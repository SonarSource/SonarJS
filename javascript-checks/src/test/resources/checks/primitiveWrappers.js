function sayHello() {
  var x = new Boolean(false); // NOK
  if (x) {
    alert('hi');  // Shows 'hi'.
  }

  var x = Boolean(0); // OK
  if (x) {
    alert('hi');  // This will never be alerted.
  }

  new Number(1); // NOK
  new String('2'); // NOK

  new MyObject(); // OK
}
