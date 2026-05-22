declare function require(name: string): any;

const Handlebars = require('handlebars');
const MustacheModule = require('mustache');
const swig = require('swig');
const kramed = require('kramed');

const source = '<p>attack {{name}}</p>';
const options = {
  noEscape: true,
};

function invalidSanitizer(text: string) {
  return text;
}

Handlebars.compile(source, options);
MustacheModule.escape = invalidSanitizer;
swig.setDefaults({ autoescape: false });
new kramed.Renderer({ sanitize: false });
