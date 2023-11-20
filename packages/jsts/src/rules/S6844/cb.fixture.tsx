
<a href="javascript:void(0)" onClick={foo}>Perform action</a>; // Noncompliant {{Anchor used as a button. Anchors are primarily expected to navigate. Use the button element instead.}}

<a href="#" onClick={foo}>Perform action</a>; // Noncompliant

<a onClick={foo}>Perform action</a>; // Noncompliant

