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

  it('recognizes an assertion after sending a body', async function () { // Compliant
    await supertest(app).post('/foo').send({ a: 1 }).expect(201);
  });

  it('recognizes an assertion after setting a header', async function () { // Compliant
    await supertest(app).get('/foo').set('Authorization', 'token').expect(200);
  });

  it('recognizes an assertion after setting a header and sending a body', async function () { // Compliant
    await supertest(app).post('/foo').set('Authorization', 'token').send({ a: 1 }).expect(201);
  });

  it('should fail when no assertion', function () { // Noncompliant {{Add at least one assertion to this test case.}}
    return supertest(app).get(`/foo/bar`);
  });

  it('should fail when a request only sends a body', function () { // Noncompliant {{Add at least one assertion to this test case.}}
    return supertest(app).post('/foo').send({ a: 1 });
  });

  it('should fail when a request only sets a header', function () { // Noncompliant {{Add at least one assertion to this test case.}}
    return supertest(app).get('/foo').set('Authorization', 'token');
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
