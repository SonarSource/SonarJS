function f(x, y, z) {
  var i;
  for (i = x; i < y; i++) {}
  for (i = x; i > y; i++) {} // Noncompliant
  for (i = x; i >=y; i++) {} // Noncompliant
  for (i = x; i > y; i--) {}
  for (i = x; i < y; i--) {} // Noncompliant
  for (i = x; i <=y; i--) {} // Noncompliant
  for (i = x; y > i; i++) {}
  for (i = x; y < i; i++) {} // Noncompliant
  for (i = x; y <=i; i++) {} // Noncompliant
  for (i = x; y < i; i--) {}
  for (i = x; y > i; i--) {} // Noncompliant
  for (i = x; y >=i; i--) {} // Noncompliant
  for (i = x; x < y; i--) {}
  for (i = x; x > y; i--) {}
  for (i = x; i > y; i-=1 ) {}
  for (i = x; i > y; i+=1 ) {} // Noncompliant
  for (i = x; i > y; i-=+1) {}
  for (i = x; i > y; i+=-x) {}
  for (i = x; i > y; i+=z ) {}
  for (i = x; i > y; i=i-1) {}
  for (i = x; i > y; i=i+1.) {} // Noncompliant
  for (i = x; i > y; i=i+z) {}
  for (i = x; i > y; i=z+1) {}
  for (i = x; i > y; i=i*2) {}
  for (i = x; i > y; i=i-z) {}
  for (i = x; i > y; object.x = i + 1) {}
  for (i = x; i < y; (-i)++) {}
  for (i = x; i+1 < y; i++) {}
  for (i = x; i < y; ) {}
  for (i = x; i > y; update()) {}
  for (i = x; condition(); i++) {}
  for (i = x; ; i++) {}
}