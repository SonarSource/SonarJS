declare function require(name: string): any;
declare const condition: boolean;

const Handlebars = require('handlebars');
const marked = require('marked');

const source = '<p>attack {{name}}</p>';
let options = {
  noEscape: true,
};

if (condition) {
  options = {
    noEscape: false,
  };
}

Handlebars.compile(source, options);
marked.setOptions({ sanitize: true });
