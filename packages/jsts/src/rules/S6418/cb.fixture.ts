function func() {
  const token = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y' // Noncompliant
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  let api_key = 'not enough entropy'
  api_key = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVVcgVuAIOB6hzcWjDnv16V6hDLevW0Qs4hKPbP1M4YfuDI16sZna1/VGRLkAbTk6xMPs4epH6A3ZqSyyI-H92y' // Noncompliant
}
function entropyTooLow() {
  const token = 'rf6acB24J//1FZLRrKpjmBUYSnUX5CHlt/iD5vVaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}
class MyClass {
  secret = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' // Noncompliant
}

function inFunctionCall() {
  callWithSecret({ secret: '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' }) // Noncompliant

  function callWithSecret({}) {}
}
function functionWithSecret({ secret = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' }) { // Noncompliant
//                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  }
function cleanFunction(someArg, parameter='a string', anotherParameter: 42, ...args) {
  another_call(42, 'a string', parameter, { a_keyword: 42 }, args)

  function another_call(...foo) {}
}

const someObject = {
  secret: '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=', // Noncompliant
//        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  not_a_problem: 'not_a_secret',
  42: 'forty-two'
}

function multipleAssignment() {
  let nothing = 1, secret = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v.~=', nothing_else = 2; // Noncompliant
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
}
function assignmentWithType() {
  const secret: string = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.=' // Noncompliant
  let someVar: string;
  const anotherVar: number = 42
}

function defaultValues(foo) {
  let secret;
  secret = foo || '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.='; // Noncompliant
  secret = foo ?? '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.='; // Noncompliant
}

function customSecretWord() {
  const yolo = '1IfHMPanImzX8ZxC-Ud6+YhXiLwlXq$f_-3v~.='; // Noncompliant
}
