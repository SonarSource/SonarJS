const items = [{ foo: true, bar: false }];
items.forEach(item => {
  item = {
    ...item,
    bar: true,
  };
});
