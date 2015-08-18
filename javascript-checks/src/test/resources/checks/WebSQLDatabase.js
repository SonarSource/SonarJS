var db1 = window.openDatabase("myDb", "1.0", "P", 2*1024*1024);  // Nok
var db2 = openDatabase("myDb", "1.0", "P", 2*1024*1024);  // Nok
var db3 = this.openDatabase("myDb", "1.0", "P", 2*1024*1024, callback);  // Nok

var db4 = db.openDatabase("myDb", "1.0", "P", 2*1024*1024);  // ok

var win = window;
win.openDatabase("db","1.0","stuff",2*1024*1024);  // NOK
win.somethingElse(); // OK
