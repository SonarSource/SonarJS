
function f() {
  let r = new RegExp('([');
  let str = 'foo';
  let m = str.match('([');
  console.log(r, m);
}

