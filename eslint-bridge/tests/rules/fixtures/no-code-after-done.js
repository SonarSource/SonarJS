const expect = require("chai").expect;
const fs = require("fs");

describe("Code is executed after Done", function() {
    it("Has asserts after done()", function(done) {
        try {
            expect(1).toEqual(2);
        } catch (err) {
            done();
//          ^^^^^^>
            // This assertion will be ignored and test will pass.
            expect(err).to.be.an.instanceof(RangeError);  // Noncompliant {{Move this code before the call to "done".}}
//          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        }
    });

    it("Throws an error some time after done()", function(done) {
        fs.readFile("/etc/bashrc", 'utf8', function(err, data) {
            done();
            setTimeout(() => {  // Noncompliant
                // This assertion error will not be assigned to any test.
                // Developers will have to guess which test failed.
                expect(data).to.match(/some expected string/);
            }, 3000);
        });
    });

    it("Has code after done", function(done) {
        fs.readFile("/etc/bashrc", 'utf8', function(err, data) {
            done();
            fs.readFile("/etc/zshrc", 'utf8', function(err, data) {  // Noncompliant
                // This assertion error will be assigned to "Other test".
                expect(data).to.match(/some expected string/);
            });
        });
    });

    it("Other test", function(done) {
        done()
    });

    it("Has code after done(err)", function(done) {
        try {
            throw Error("An error");
        } catch (err) {
            done(err);
        }
        fs.readFile("/etc/bashrc", 'utf8', function(err, data) {  // FN Noncompliant
            // This assertion error will be assigned to "Other test".
            expect(data).to.match(/some expected string/);
        });
    });

    it("No done", function() {
        done();
    });

    it("parameter is not identifier", function({done}) {
        done();
    });
});
