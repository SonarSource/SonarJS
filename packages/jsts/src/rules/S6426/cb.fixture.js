describe.only("only on root describe"); // Noncompliant [[qf1]] {{Remove ".only()" from your test case.}}
//       ^^^^
// fix@qf1 {{Remove ."only()".}}
// edit@qf1 {{describe("only on root describe");}}

describe("no exclusive tests", function() {
    describe.only("a describe with a .only()", function () { // Noncompliant
//           ^^^^
    });
    it.only("is an 'it' statement using .only()", function () { // Noncompliant
//     ^^^^
    });
    test.only("is a 'test' statement using .only()", function () { // Noncompliant
//       ^^^^
    });
    it// skipping a line here
    .only("should be flagged with a comment slipped in the middle."); // Noncompliant [[qf2]] {{Remove ".only()" from your test case.}}
//   ^^^^
// fix@qf2 {{Remove ."only()".}}
// edit@qf2 [[sc=4;ec=9]] {{}}


    it("works fine");
});

describe.skip();

function only() {}
only();

const someObject = {
    only: () => {}
};
someObject.only();
