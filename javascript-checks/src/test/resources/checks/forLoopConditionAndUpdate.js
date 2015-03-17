var i, j, k;
for (i = 0; i < 3; i++) {}
for (i = 0; i < 3; j++) {} // Noncompliant
for (i = 0; i < 3; i+=1) {}
for (i = 0; i < 3; j+=1) {} // Noncompliant
for (i = 0; i < 3; j++, i++) {}
for (i = 0; i < 3 && j < 4; k++) {} // Noncompliant
for (i = 0; i < 3; update()) {}
for (i = 0; condition(i); i++) {}
for (i = 0; condition(); i++) {} // Noncompliant
for (i = 0; x.y.condition(); x.y.update()) {}
for (i = 0; x.y.condition(); x.z.update()) {}
for (i = 0; x.y.condition(); z.y.update()) {} // Noncompliant
for (i = 0; this.i < 3; this.i++) {}
for (i = 0; this.i < 3; this.j++) {} //Noncompliant
for (i = 0; i < 3; j = -i) {} //Noncompliant
for (i = 0; x.y.condition(i); i++) {}
for (i = 0; x.y.condition[i]; i++) {}
for (i = 0; x.y < 3; x = x.next) {}
for (i = 0; i < 3; ) {}
for (i = 0; ; i++) {}
