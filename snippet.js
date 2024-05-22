function func1(m) {
  m.x = 1;
}
function loadAll(f) {
  f(null);
}
loadAll(func1);
