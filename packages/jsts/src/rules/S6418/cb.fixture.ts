function func() {
  const token = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y' // Noncompliant {{"token" detected here, make sure this is not a hard-coded secret.}}
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  let api_key = 'not enough entropy'
  api_key = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y' // Noncompliant {{"api_key" detected here, make sure this is not a hard-coded secret.}}
}
function entropyTooLow() {
  const token = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}
class MyClass {
  secret = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
}

function inFunctionCall() {
  callWithSecret({ secret: '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' }) // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}

  function callWithSecret({}) {}
}
function functionWithSecret({ secret = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' }) { // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
//                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  }
function cleanFunction(someArg, parameter='a string', anotherParameter: 42, ...args) {
  another_call(42, 'a string', parameter, { a_keyword: 42 }, args)

  function another_call(...foo) {}
}

const someObject = {
  secret: '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=', // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
//        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  not_a_problem: 'not_a_secret',
  42: 'forty-two'
}

function multipleAssignment() {
  let nothing = 1, secret = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v.~=', nothing_else = 2; // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
}
function assignmentWithType() {
  const secret: string = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
  let someVar: string;
  const anotherVar: number = 42
}

function defaultValues(foo) {
  let secret;
  secret = foo || '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.='; // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
  secret = foo ?? '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.='; // Noncompliant {{"secret" detected here, make sure this is not a hard-coded secret.}}
}

function customSecretWord() {
  const yolo = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.='; // Noncompliant {{"yolo" detected here, make sure this is not a hard-coded secret.}}
}
