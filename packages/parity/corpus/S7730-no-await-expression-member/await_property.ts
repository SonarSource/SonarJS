async function readValue(promise: Promise<{ value: number }>) {
  return (await promise).value;
}
