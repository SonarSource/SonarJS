// basic set
localStorage.setItem("login", login); // NOK
sessionStorage.setItem("sessionId", sessionId); // NOK

// access via Window object
Window.localStorage.getItem("login"); // NOK
Window.sessionStorage.setItem("sessionId"); // NOK

// indirect access via var
var lStorage = Window.localStorage;
lStorage.setItem("login", login);  // TODO SONARJS-512

var sStorage = Window.sessionStorage;
sStorage.setItem("sessionId", sessionId);  // TODO SONARJS-512

var lStorage = localStorage;
var login = lStorage.getItem("login");  // TODO SONARJS-512

var sStorage = sessionStorage;
sStorage.getItem("sessionId");  // TODO SONARJS-512

// test other api methods
localStorage.removeItem("login");  // NOK
Window.localStorage.removeItem("myVal");  // NOK

localStorage.clear();  // NOK
Window.localStorage.clear();  // NOK

localStorage.key(0);  // NOK
Window.localStorage.key(1);  // NOK

// direct array access
var foo = localStorage.getItem("foo");  // NOK
var bar = localStorage[0];  // NOK
Window.sessionStorage['login'] = "bubba";  // NOK

