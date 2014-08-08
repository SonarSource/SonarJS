function first() {
}

function second() {
}

var Person = function(first, last, middle) {
    this.first = first;
    this.middle = middle;
    this.last = last;
};

var anonFun1 = function() { }; var anonFun2 = function() { doSomething(); };

function * third() {
}

var generator = function * () { doSomething(); };

var obj = {
     * generator () {}
}
