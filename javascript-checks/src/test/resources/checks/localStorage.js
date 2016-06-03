// basic set
localStorage.setItem("login", login); // Noncompliant [[effortToFix=12]] {{Remove all use of "localStorage"; use cookies or store the data on the server instead.}}
  sessionStorage.setItem("sessionId", sessionId); // Noncompliant [[effortToFix=0]] {{Remove all use of "sessionStorage"; use cookies or store the data on the server instead.}}
//^^^^^^^^^^^^^^
// access via Window object
Window.localStorage.getItem("login"); // NOK
Window.localStorage.setItem("sessionId"); // NOK

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
Window.localStorage['login'] = "bubba";  // NOK

obj.foo(function(){ window.localStorage.getItem("item"); }).bar();
