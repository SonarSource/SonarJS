/**
 * @param {{ bar: string } | null | undefined} foo
 */
function test(foo) {
  return foo && foo.bar;
}
