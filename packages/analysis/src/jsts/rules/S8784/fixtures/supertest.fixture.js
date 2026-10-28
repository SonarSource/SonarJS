import supertest from 'supertest';

const http = () => supertest(app);
const fakeHttp = () => fakeRequest(app);

// flagged: top-level local Supertest factory assertion in a file with test structure.
await http().get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe('supertest', async () => {
  // flagged: awaited supertest assertion directly in the (async) describe body.
  // Exercises the await/chain-transparent statement walk.
  await supertest(app).get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await http().get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await fakeHttp().get('/').expect(200); // Compliant

  it('responds with 200', async () => {
    await supertest(app).get('/').expect(200); // Compliant
    await http().get('/').expect(200); // Compliant
  });
});
