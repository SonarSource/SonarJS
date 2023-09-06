<div class="foo"></div>; // Noncompliant [[qf1]] {{Unknown property 'class' found, use 'className' instead}}
//   ^^^^^^^^^^^
// fix@qf1 {{Replace with 'className'}}
// edit@qf1 [[sc=0;ec=24]] {{<div className="foo"></div>;}}
<div aria-foo="bar"></div>; // Noncompliant
<img src="foo.png" />
