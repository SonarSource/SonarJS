import jQuery = require('jquery');

const input = '  Sonar  ';

jQuery.trim(input); // Noncompliant {{Use String.prototype.trim() instead of deprecated jQuery.trim().}}
//     ^^^^
