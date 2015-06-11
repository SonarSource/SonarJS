var someWindow1 = window.open("url", "name");
someWindow1.postMessage("message", "*"); // NOK

someWindow2 = document.getElementById("frameId").contentWindow;
someWindow2.postMessage("message", "*"); // NOK

var someWindow3 = window.frames[1];
someWindow3.postMessage("message", "*"); // NOK