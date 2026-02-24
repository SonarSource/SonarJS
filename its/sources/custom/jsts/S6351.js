const datePattern = /\d{4}-\d{2}-\d{2}/g;
datePattern.test('2020-08-06');
datePattern.test('2019-10-10'); // Noncompliant

const str = 'foodie fooled football';
while ((result = /foo*/g.exec(str)) !== null) { // Noncompliant
  /* ... */
}

const stickyPattern = /abc/gy; // Noncompliant
stickyPattern.test(/* ... */);
