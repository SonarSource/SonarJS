/**
 * @return {String}
 */
function sayHello() {
  /*
  this line is fine, but the following is not
  if (something) {

  no issue on the following line, because there is at most one violation per comment
  if (something) {
  */

  // the following line is not ok
  // if (something) {

  // good

  // ====
  // ----
  // ++++

  // good
  // http://www.example.com/ = http://www.example.com/

  /*jslint bitwise: false, browser: true, continue: false, devel: true, eqeq: false, evil: false, forin: false, newcap: false, nomen: false, plusplus: true, regexp: true, stupid: false, sub: false, undef: false, vars: false */
  /*jshint bitwise: false, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: false, nonew: true, plusplus: false, regexp: false, undef: true, strict: true, trailing: true, expr: true, regexdash: true, browser: true, jquery: true, onevar: true, nomen: true */
  /*global myGlobal: true */

}
