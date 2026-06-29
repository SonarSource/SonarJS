import supertest from 'supertest';

describe('supertest', async () => {
  // flagged: awaited supertest assertion directly in the (async) describe body.
  // Exercises the await/chain-transparent statement walk.
  await supertest(app).get('/').expect(200); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  it('responds with 200', async () => {
    await supertest(app).get('/').expect(200); // Compliant
  });
});
