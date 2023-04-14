'foo'.match(42);
'foo'.match(/bar/g);
foo.match(/foo/);

'foo'.match(/bar/); // Noncompliant {{Use the "RegExp.exec()" method instead.}}
//    ^^^^^
