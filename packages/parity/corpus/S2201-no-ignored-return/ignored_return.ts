const values = [1, 2, 3];
values.map(value => value * 2);

let found: number | undefined;
values.find(value => {
  found = value;
  return value > 1;
});

'abc'.replace(/ab/, () => '');
