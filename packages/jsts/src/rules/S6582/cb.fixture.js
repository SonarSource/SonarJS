function f() {
    foo && foo.a; // Noncompliant [[qf1!]] {{Prefer using an optional chain expression instead, as it's more concise and easier to read.}}
//  ^^^^^^^^^^^^
// edit@qf1 [[sc=4;ec=17]] {{foo?.a;}}
}
