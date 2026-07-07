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

import { describe as d, it as t } from 'node:test';
import assert from 'node:assert/strict';

d('node:assert/strict', () => {
  t('should recognize assert/strict assertions', () => { // Compliant
    assert.strictEqual(1, 1);
  });

  t('should raise without assertions', () => { // Noncompliant
    const x = 1 + 2;
  });
});
