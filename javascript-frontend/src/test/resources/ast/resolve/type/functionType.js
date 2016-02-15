function f1(p1){}

var f2 = function f2Name(p2, p3){}

f1(2)

f2("str", true)
f2(1)
f2(true, true, true)

f3 = function({name:n, age:a}, msg){}

f3(obj, "str")

var f4 = (arrowP1, arrowP2) => { foo(arrowP1 + arrowP2); };
f4(1, 2);
foo(f4);
