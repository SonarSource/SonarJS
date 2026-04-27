/* eslint no-sequences: ["error"] */
const list = (1, 2, 3);
console.log(list);

let node = { payload: 'a', parent: undefined };
let cur = '';
while (node = node.parent, cur = node?.payload ?? '') {
  if (!node) break;
}
