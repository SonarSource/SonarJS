describe.only("only on root describe"); // Noncompliant {{Remove .only() from your test case.}}
//       ^^^^

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
    .only("should be flagged with a comment slipped in the middle."); // Noncompliant
//   ^^^^
    it("works fine");
});

describe.skip();

function only() {}
only();

const someObject = {
    only: () => {}
};
someObject.only();