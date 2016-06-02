var someWindow1 = window.open("url", "name");
someWindow1.postMessage("message", "*"); // Noncompliant {{Make sure this cross-domain message is being sent to the intended domain.}}
//          ^^^^^^^^^^^

someWindow2 = document.getElementById("frameId").contentWindow;
someWindow2.postMessage("message", "*"); // Noncompliant

var someWindow3 = window.frames[1];
someWindow3.postMessage("message", "*"); // Noncompliant

otherWindow.postMessage("message", "*");  // Noncompliant
getWindow().postMessage("message", "*"); // Noncompliant

function foo(window, otherWindow){
  window.postMessage("message", "*");     // Noncompliant
}
