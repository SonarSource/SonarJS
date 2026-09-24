test('normalizes 200', () => {
  const status = normalize(200);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes 201', () => {
  const status = normalize(201);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes 202', () => {
  const status = normalize(202);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});
