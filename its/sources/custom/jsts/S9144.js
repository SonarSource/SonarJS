const source = '{"name":"Sonar"}';
const input = '  Sonar  ';
const values = ['Sonar'];

const list = jQuery.isArray(values);
const settings = jQuery.parseJSON(source);
const startedAt = jQuery.now();
const label = jQuery.trim(input);
const position = jQuery.inArray('Sonar', values, 0);

export { label, list, position, settings, startedAt };
