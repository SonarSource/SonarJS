const Handlebars = require("handlebars");
var options = {
noEscape: true // Sensitive
};
var source = "<p>attack {{name}}</p>";
var template = Handlebars.compile(source, options); // Sensitive