import supertest from 'supertest';
import foo from 'supertest';

describe('supertest', function () { // Compliant
  it('should work when assigned to a variable named "supertest" and the "get" HTTP verb', function () {
    return supertest(app).get(`/foo/bar`).expect('Content-Type', /json/u).expect(200);
  });

  it('should work regardless of the HTTP verb', function () { // Compliant
    return supertest(app).foo(`/foo/bar`).expect('Content-Type', /json/u).expect(200);
  });

  it('should work regardless of the name of the assigned variable', function () { // Compliant
    return foo(app).get(`/foo/bar`).expect('Content-Type', /json/u).expect(200);
  });

  it('should fail when no assertion', function () { // Noncompliant
    return supertest(app).get(`/foo/bar`);
  });
});

import assert from 'node:assert/strict';

describe('node:assert/strict', () => {
  it('should recognize assert/strict assertions', () => { // Compliant
    assert.strictEqual(actual, expected);
  });

  it('should raise without assertions', () => { // Noncompliant
    const x = 1 + 2;
  });
});
