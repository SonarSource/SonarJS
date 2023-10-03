describe("MyClass", function () {
    it.only("should run correctly", function () { // Noncompliant
        /*...*/
    });
});

describe("MyClass", function () {
    it("should run correctly", function () { // compliant
        /*...*/
    });
});
