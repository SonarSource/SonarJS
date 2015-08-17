// WINDOW
var windowCopy = window;

var newWindow = windowCopy.open("url", "name");

var frames = window.frames  // Returns the window itself

var subFrame1 = frames[1]
var subFrame2 = window["name"]
var subFrame3 = window.frames[name]



// DOM element

var documentCopy = document;
var element1 = document.getElementById("id");
var element2 = document.elementFromPoint(2, 2);
var element3 = document.activeElement;
var element4 = document.documentElement;

var element5 = document.getElementsByTagName("iframe")[0];
var elementList = document.getElementsByClassName("MyClass");
var element6 = elementList[i];


