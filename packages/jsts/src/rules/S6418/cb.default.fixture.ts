function func() {
    const token = "rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y" // Noncompliant
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    let api_key = "not enough entropy"
    api_key = "rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y" // Noncompliant
}
function entropy_too_low() {
    const token = "rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }
class MyClass {
    secret = "1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=" // Noncompliant
}

function in_function_call() {
  call_with_secret({ secret: "1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=" }) // Noncompliant

  function call_with_secret({}) {}
}
function function_with_secret({ secret = "1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=" }) { // Noncompliant
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  }
function clean_function(some_arg, parameter="a string", another_parameter: 42, ...args) {
  another_call(42, "a string", parameter, { a_keyword: 42 }, args)

  function another_call(...foo) {}
}

const some_dict = {
    "secret": "1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=", // Noncompliant
//            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    "not_a_problem": "not_a_secret",
    42: "forty-two"
}

function multiple_assignment() {
  let nothing = 1, secret = "1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v.~=", nothing_else = 2; // Noncompliant
                       //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
}
function assignment_with_type() {
    const secret: string = "1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=" // Noncompliant

    let some_var: string;
    const another_var: number = 42
  }
