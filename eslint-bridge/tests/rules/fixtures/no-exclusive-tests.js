describe("no exclusive tests", function() {
    describe.only("a describe with a .only()", function () { // Noncompliant {{ Remove this }}
//          ^^^^^
    });
    it.only("is an 'it' statement using .only()", function () { // Noncompliant {{ Remove this }}
//    ^^^^^
    });
    it// skipping a line here
    .only("should be flagged with a comment slipped in the middle.");
//  ^^^^^
    it("works fine");
});
