var obj = {a: 1};
+obj;           // NOK
-obj;           // NOK
+obj.a;   // OK

function foo() {
  return 1;
}

+foo;           // NOK
-foo();    // OK

var obj2 = new Foo();
-obj2;          // NOK

var x = 1;
+x;       // OK

y = true
+y;       // OK

z = "string"
-z;        // OK

-"24";     // OK
+1;       // OK
-true;    // OK

var o1 = new String("");
var o2 = new Boolean(true);
var o3 = new Number(1);
+o1; // OK
+o2; // OK
+o3; // OK*/

+(new Date());   // OK
var d = new Date();
+d;    // OK
-d;    // NOK
+ someDate;    // OK
+ date;    // OK