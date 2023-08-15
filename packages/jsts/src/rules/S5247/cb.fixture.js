/**
 * Handlebars cases
*/

const Handlebars = require("handlebars");
var options1 = {
  noEscape: false // Compliant
};
var source1 = "<p>attack {{name}}</p>";
var template1 = Handlebars.compile(source1, options1); // Compliant

var options2 = {
  noEscape: true
};
if (x) {
  options2 = {
    noEscape: false
  }
};
var source2 = "<p>attack {{name}}</p>";
var template2 = Handlebars.compile(source2, options2); // Compliant

var source3 = "<p>attack {{name}}</p>";
var template3 = Handlebars.compile(source3); // Compliant by default noEscape is set to false

var options4 = {
  noEscape: true // Sensitive
//^^^^^^^^^^^^^^>
};
var source4 = "<p>attack {{name}}</p>";
var template4 = Handlebars.compile(source4, options4); // Noncompliant {{Make sure disabling auto-escaping feature is safe here.}}
//              ^^^^^^^^^^^^^^^^^^

/**
 * Markdown cases
*/

var md = require('markdown-it')({
  html: false
});  // Compliant
var result = md.render('# <b>attack</b>');
console.log(result);

var md2 = require('markdown-it')(); // Compliant by default html is set to false
var result2 = md2.render('# <b>attack</b>');
console.log(result2);

var md3 = require('markdown-it')({ // Noncompliant {{Make sure disabling auto-escaping feature is safe here.}}
//        ^^^^^^^^^^^^^^^^^^^^^^
  html: true
//^^^^^^^^^^<
});
var result3 = md3.render('# <b>attack</b>');
console.log(result3);

/**
 * Kramed cases
*/

var kramed = require('kramed');
var options5 = {
  renderer: new kramed.Renderer({
    sanitize: true  // Compliant
  })
};
console.log(kramed('Attack [xss?](javascript:alert("xss")).', options)); // Compliant

var options6 = {
  renderer: new Unknown({
    sanitize: true
  })
};

var options7 = {
  renderer: new kramed.Renderer({ // Noncompliant {{Make sure disabling auto-escaping feature is safe here.}}
//              ^^^^^^^^^^^^^^^
    sanitize: false
//  ^^^^^^^^^^^^^^^<
  })
};
console.log(kramed('Attack1 [xss?](javascript:alert("xss")).', options7));
console.log(kramed('Attack2 [xss?](javascript:alert("xss")).')); // Without option it's not sanitized, but likely if the user doesn't pass option, "it's a basic rendering"

/**
 * Marked cases
*/

const marked = require('marked');
marked.setOptions({
  renderer: new marked.Renderer(),
  sanitize: true // Compliant
});
console.log(marked("# test <b>attack/b>"));

const marked2 = require('marked');
marked2.setOptions({
  renderer: new marked2.Renderer()
}); // Compliant by default sanitize is set to true
console.log(marked2("# test <b>attack/b>"));

  const marked3 = require('marked');
  marked3.setOptions({ // Noncompliant {{Make sure disabling auto-escaping feature is safe here.}}
//^^^^^^^^^^^^^^^^^^
    renderer: new marked3.Renderer(),
    sanitize: false
//  ^^^^^^^^^^^^^^^<
  });
  console.log(marked3("# test <b>attack/b>"));

/**
 * Mustache cases
*/

const MustacheModule = require('mustache');
function renderHello() {
  const inputName = '<b>Luke</b>';
  const template = document.getElementById('template').innerHTML;
  const rendered = MustacheModule.render(template, { name: inputName }); // Compliant
  document.getElementById('target').innerHTML = rendered;
}

function renderHello2() {
  var inputName = "<b>Luke</b>";
  var template = document.getElementById('template').innerHTML;
  MustacheModule.escape = function(text) {return text;}; // Noncompliant {{Make sure disabling auto-escaping feature is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^
  var rendered = MustacheModule.render(template, { name: inputName });
  document.getElementById('target').innerHTML = rendered;
}
function invalidSanitizer(text) {
  return text;
}
function renderHello3() {
  MustacheModule.escape = invalidSanitizer; // Noncompliant {{Make sure disabling auto-escaping feature is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^
}

function renderHello4() {
  MustacheModule.escape = text => text; // Noncompliant
}

function renderHello5() {
  const invalidSanitizer = text => text;
  MustacheModule.escape = invalidSanitizer; // Noncompliant
}

function renderHello6() {
  const invalidSanitizer = function(text) {return text;};
  MustacheModule.escape = invalidSanitizer; // Noncompliant
}

  var templateM = document.getElementById('template').innerHTML;
  Mustache.escape = function(text) {return text;}; // Noncompliant
//^^^^^^^^^^^^^^^
  var renderedM = Mustache.render(templateM, { name: inputName });
  document.getElementById('target').innerHTML = rendered;

