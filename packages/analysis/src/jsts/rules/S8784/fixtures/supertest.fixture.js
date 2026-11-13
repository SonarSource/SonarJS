import supertest, { agent as createAgent } from 'supertest';

const http = () => supertest(app);
const agent = () => createAgent(app);
const fakeHttp = () => fakeRequest(app);
const read = id => supertest(app).get('/items/' + id);
const check = (req, status) => req.expect(status);

// flagged: top-level local Supertest factory assertion in a file with test structure.
await http().get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe('supertest', async () => {
  // flagged: awaited supertest assertion directly in the (async) describe body.
  // Exercises the await/chain-transparent statement walk.
  await supertest(app).get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await http().get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await fakeHttp().get('/').expect(200); // Compliant
  await agent().get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await read('x').expect(404); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await check(read('x'), 404); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  await read('x'); // Compliant
  await check(fakeRequest(app), 404); // Compliant

  it('responds with 200', async () => {
    await supertest(app).get('/').expect(200); // Compliant
    await http().get('/').expect(200); // Compliant
    await read('x').expect(404); // Compliant
    await check(read('x'), 404); // Compliant
  });
});
