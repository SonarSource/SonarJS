/*
 * Header
 */

var Person = function(first, last, middle) {
    this.first = first;
    this.middle = middle;
    this.last = last;
};

Person.prototype = {

    //
    // Just a comment
    //

    whoAreYou : function() {
        return this.first + (this.middle ? ' ' + this.middle: '') + ' ' + this.last;
    },

    set first(first) {
        this.first = first;
    },

    get first() {
        return this.first;
    }
};

class Utils {
    foo() {}
}
