async function readValue(promise: Promise<{ value: number }>) {
  const result = await promise;
  return result.value;
}
