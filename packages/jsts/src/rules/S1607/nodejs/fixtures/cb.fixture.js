// Test cases with Node.js

const test = require('node:test');

test('should do something', function(t) {
  t.assert.ok(true);
});

test('should do something', { skip: 'There is a bug in the code' }, function(t) { // Compliant
  t.assert.ok(true);
});

test('should do something', { skip: true }, function(t) { // Noncompliant {{Remove this unit test or explain why it is ignored.}}
//                            ^^^^^^^^^^
  t.assert.ok(true);
});

test('should do something', { skip: '' }, function(t) { // Noncompliant
  t.assert.ok(true);
});

test('should do something', function(t) {
  t.skip('There is a bug in the code'); // Compliant
});

test('should do something', function(t) {
  t.skip(); // Noncompliant
});

test('should do something', function(t) {
  t.skip(''); // Noncompliant
});

test('should do something');

test('should do something', unknown);

test('should do something', function() {

});

test('should do something', function(t) {

});

test('should do something', function(t) {
  t.diagnostic('A diagnostic message');
});

test('should do something', 42, function() {

});

test('should do something', {}, function() {

});

test('should do something', { skip: false }, function() {

});