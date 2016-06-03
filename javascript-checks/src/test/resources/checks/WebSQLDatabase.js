var db1 = window.openDatabase("myDb", "1.0", "P", 2*1024*1024);  // Noncompliant {{Convert this use of a Web SQL database to another technology}}
//               ^^^^^^^^^^^^
var db2 = openDatabase("myDb", "1.0", "P", 2*1024*1024);  // Noncompliant
//        ^^^^^^^^^^^^
var db3 = this.openDatabase("myDb", "1.0", "P", 2*1024*1024, callback);  // Noncompliant

var db4 = db.openDatabase("myDb", "1.0", "P", 2*1024*1024);  // ok

var win = window;
win.openDatabase("db","1.0","stuff",2*1024*1024);  // Noncompliant
win.somethingElse(); // OK
