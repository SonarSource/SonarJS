const source = '{"name":"Sonar"}';
const input = '  Sonar  ';
const values = ['Sonar'];

jQuery.isArray(values); // Noncompliant {{Use Array.isArray() instead of deprecated jQuery.isArray().}}
//     ^^^^^^^

jQuery.parseJSON(source); // Noncompliant {{Use JSON.parse() instead of deprecated jQuery.parseJSON().}}
//     ^^^^^^^^^

jQuery.now(); // Noncompliant {{Use Date.now() instead of deprecated jQuery.now().}}
//     ^^^

jQuery.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//     ^^^^

jQuery.inArray('Sonar', values, 0); // Noncompliant {{Use Array.prototype.indexOf() instead of jQuery.inArray() to reduce dependence on jQuery.}}
//     ^^^^^^^

{
  const $ = require('jquery');
  $.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
  //^^^^
}

Array.isArray(values);
JSON.parse(source);
Date.now();
input.trim();
values.indexOf('Sonar', 0);

$.trim(input);
$('p').trim();
jQuery['trim'](input);
jQuery?.trim(input);
jQuery.trim.call(null, input);
require('jquery').trim(input);

function shadowedJQuery(jQuery) {
  jQuery.trim(input);
}

function shadowedDollar($) {
  $.trim(input);
}
