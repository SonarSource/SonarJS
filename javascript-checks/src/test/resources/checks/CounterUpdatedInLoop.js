
function foo_loop() {
  for (var i = 0, j = 2; i < 5; i++) {
    i = 5;      // Noncompliant [[sc=5;ec=6;secondary=-1]]
    j = 5;      // compliant, ignored as it's not in update section
  }

  for (var i; i < 5; i++) {
    i = 5;     // Noncompliant {{Remove this assignment of "i".}}
  }

  i = 0;
  for (; i < 5; i++) {
    i = 5;     // Noncompliant
  }

  for (k = 0, t = 6, l = 2; k < 5; k++) {
    k = 5;      // Noncompliant
    l = 5;      // Compliant
  }

  for (m = 0; m < 5; m++) {
    m = 5;      // Noncompliant
  }

  var x = 5;

  for (x += 2; x < 5; x++) {
    x = 5;      // Noncompliant
  }

  fl = false;

  for (; i < m && !fl; i++) {
    fl = true;   // Compliant
    m = 10;      // Compliant
  }

  for (;; i++, --j) {
    i++;  // Noncompliant
    j++;  // Noncompliant
  }

  for (;; ++i, j--, k++) {
    i = 5; // Noncompliant
    j = 5; // Noncompliant
    k = 5; // Noncompliant
  }

  for (;; i+=2, j-=3, k*=5) {
    i++;  // Noncompliant
    j++;  // Noncompliant
    k++;  // Noncompliant
  }

  for (var x = foo(); ; x=next()) {
    x = next(); // Noncompliant
  }

}



function foo_of_loop(obj) {
  for (var prop1 of obj) {
    prop1 = 1      // Noncompliant
  }

  for (const prop2 of obj) {
    prop2 = 1      // Noncompliant
  }

  for (prop3 of obj) {
    prop3 = 1      // Noncompliant
  }

  for (var prop4 = "foo" of obj) {
    prop4 = 1      // Noncompliant
  }

}

function foo_in_loop(obj) {
  for (var value1 in obj) {
    value1 = 1      // Noncompliant
  }

  for (const value2 in obj) {
    value2 = 1      // Noncompliant
  }

  for (value3 in obj) {
    value3 = 1      // Noncompliant
  }

  for (var value4 in obj) {
    value4 = 1      // Noncompliant
  }

}


function description_sample_code() {

  var names = [ "Jack", "Jim", "", "John" ];
  for (var i = 0; i < names.length; i++) {
    if (!names[i]) {
      i = names.length;       // Noncompliant {{Remove this assignment of "i".}}
    } else {
      console.log(names[i]);
    }
  }

  i = 42;  // Compliant, out of loop

  for (var name of names) {
    if (!name) {
      break;
    } else {
      console.log(name);
    }
  }

}



function same_counter_in_nested_loop(obj1, obj2) {

  for (var i in obj1) {

    for (i of obj2) {      // Noncompliant {{Remove this assignment of "i".}}
      foo(i);
    }
  }
}


function assigned_several_times(obj) {
  for (var value in obj) {
    value = 1;      // Noncompliant
    value = 1;      // Noncompliant
  }
}


function used_several_times(obj) {
  for (var i = 0; i < 10; i++) {

    for (var j = 0; j < 10; j++, i++) {  // Noncompliant [[secondary=-2]]
      i = 10;    // Noncompliant [[secondary=-3]]
    }
  }
}
