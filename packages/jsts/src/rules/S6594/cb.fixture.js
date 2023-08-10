'foo'.match(42); // Noncompliant {{Use the "RegExp.exec()" method instead.}}
'foo'.match(/bar/g);
foo.match(/foo/);

'foo'.match(/bar/); // Noncompliant [[qf1]] {{Use the "RegExp.exec()" method instead.}}
//    ^^^^^
// fix@qf1 {{Replace with "RegExp.exec()"}}
// edit@qf1 [[ec=19]] {{RegExp(/bar/).exec('foo');}}
