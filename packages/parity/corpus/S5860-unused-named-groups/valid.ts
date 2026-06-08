const pattern = /(?<foo>\w)(?<bar>\w)/;
const matched = 'str'.match(pattern);
if (matched) {
  matched.groups.foo;
  matched.groups.bar;
}
