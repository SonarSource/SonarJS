'foo'.match(42); // Noncompliant {{Use the "RegExp.exec()" method instead.}}
'foo'.match(/bar/g);
foo.match(/foo/);

'foo'.match(/bar/); // Noncompliant [[qf1]] {{Use the "RegExp.exec()" method instead.}}
//    ^^^^^
// fix@qf1 {{Replace with "RegExp.exec()"}}
// edit@qf1 [[ec=19]] {{RegExp(/bar/).exec('foo');}}

const m1 = 'foo'.match(/bar/); // Compliant: we're checking `m1.length` below
if (m1.length > 0) {
  console.log(m1[0]);
}

let m2;
m2 = 'foo'.match(/bar/); // Compliant: we're checking `m2?.length` below
if (m2?.length > 0) {
  console.log(m2[0]);
}
