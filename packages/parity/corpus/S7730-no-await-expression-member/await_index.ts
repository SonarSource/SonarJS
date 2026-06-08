async function readIndex(promise: Promise<number[]>) {
  return (await promise)[0];
}
