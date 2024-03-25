const items = [{ foo: true, bar: false }];
items.forEach(item => {
  item = {
    foo: false,
    bar: true,
  };
});
