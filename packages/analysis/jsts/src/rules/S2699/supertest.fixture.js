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

  it('should fail when no assertion', function () { // Noncompliant {{Add at least one assertion to this test case.}}
    return supertest(app).get(`/foo/bar`);
  });
});

// due to this line, the heuristic to get the fully qualified name, has a different list of declarations
process.env.VARIABLE = 'some-token';

describe("fail", () => {
  it("should cause issues", () => {
    const test_input = process.env.OTHER_VARIABLE.substring(0, 6); // this line can use any process.env var.
    return supertest(app).get(`/foo/bar`).expect('Content-Type', /json/u).expect(200);
  });
});

