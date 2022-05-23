describe("no exclusive tests", function() {
    describe.only("a describe with a .only()", function () { // Noncompliant {{Remove .only() from your test case.}}
//           ^^^^
    });
    it.only("is an 'it' statement using .only()", function () { // Noncompliant
//     ^^^^
    });
    it// skipping a line here
    .only("should be flagged with a comment slipped in the middle."); // Noncompliant
//   ^^^^
    it("works fine");
});
