describe.only("only on root describe"); // Noncompliant [[qf1]] {{Remove ".only()" from your test case.}}
//       ^^^^
// fix@qf1 {{Remove ."only()".}}
// edit@qf1 {{describe("only on root describe");}}

describe("no exclusive tests", function() {
    describe.only("a describe with a .only()", function () { // Noncompliant [[qf2]] {{Remove ".only()" from your test case.}}
//           ^^^^
// fix@qf2 {{Remove ."only()".}}
// edit@qf2 {{    describe("a describe with a .only()", function ()}}
    });
    it.only("is an 'it' statement using .only()", function () { // Noncompliant [[qf3]] {{Remove ".only()" from your test case.}}
//     ^^^^
// fix@qf3 {{Remove ."only()".}}
// edit@qf3 {{    it("is an 'it' statement using .only()", function ()}}
    });
    test.only("is a 'test' statement using .only()", function () { // Noncompliant [[qf4]] {{Remove ".only()" from your test case.}}
//       ^^^^
// fix@qf4 {{Remove ."only()".}}
// edit@qf4 {{    test("is a 'test' statement using .only()", function ()}}
    });
    it// skipping a line here
    .only("should be flagged with a comment slipped in the middle."); // Noncompliant [[qf5]] {{Remove ".only()" from your test case.}}
//   ^^^^
// fix@qf5 {{Remove ."only()".}}
// edit@qf5 [[sc=4;ec=9]] {{}}


    it("works fine");
});

describe.skip();

function only() {}
only();

const someObject = {
    only: () => {}
};
someObject.only();
