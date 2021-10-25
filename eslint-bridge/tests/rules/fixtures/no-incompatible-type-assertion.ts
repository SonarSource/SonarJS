const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should();

describe("invalid comparisons", function() {

    it("uses chai 'assert'", function() {
        const str = "1";
        const today = new Date();
        const nb = new Number(42);

        // These assertions use non-strict equality. Only unrelated "object" types are considered.
        assert.equal(today, nb);  // Noncompliant. This always fails.
//             ^^^^^^^^^^^^^^^^
        assert.notEqual(today, nb);  // Noncompliant. This always succeeds.

        // These assertions use strict equality. Unrelated "object" types and primitive types are considered.
        assert.strictEqual(str, 1);  // Noncompliant. This always fails.
        assert.notStrictEqual(str, 1);  // Noncompliant. This always succeeds.

        // we don't support 'deepEqual' as feature rarely used
        // For deep equality the root types should be checked. Deep equality uses strict equality operator.
        assert.deepEqual({}, []);  // FN. This always fails.
        assert.notDeepEqual({}, []);  // FN. This always succeeds.

        // Comparing primitive types to objects with == or != is ok
        // even if it is not recommended. Using strict equality is better.
        assert.equal(str, [1]);  // Ok
        assert.notEqual(str, [0]);  // Ok

        assert.equal(today);
    });

    it("uses chai 'expect' and 'should'", function() {
        const str = "1";
        // These assertions use strict equality
        expect(str).to.equal(1);  // Noncompliant. This always fails.
        expect(str).to.equals(1);  // Noncompliant. This always fails.
        expect(str).to.eq(1);  // Noncompliant. This always fails.
        expect(str).to.not.equal(1);  // Noncompliant. This always succeeds.
        expect(str).to.not.equals(1);  // Noncompliant. This always succeeds.
        expect(str).to.not.eq(1);  // Noncompliant. This always succeeds.

        // deep equality
        expect([]).to.eql({});  // Noncompliant. This always fails.
        expect([]).to.not.eql({});  // Noncompliant. This always succeeds.

        str.should.equal(1);  // Noncompliant. This always fails.
        str.should.equals(1);  // Noncompliant. This always fails.
        str.should.eq(1);  // Noncompliant. This always fails.
        str.should.not.equal(1);  // Noncompliant. This always succeeds.
        str.should.not.equals(1);  // Noncompliant. This always succeeds.
        str.should.not.eq(1);  // Noncompliant. This always succeeds.

        str.should.eql([]);  // Noncompliant. This always fails.
        str.should.not.eql([]);  // Noncompliant. This always succeeds.
    });
});