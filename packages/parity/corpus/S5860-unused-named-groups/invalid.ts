const pattern = /(?<foo>\w)(?<bar>\w)/;
const matched = 'str'.match(pattern);
if (matched) {
  matched[1];
  matched.groups.baz;
}
