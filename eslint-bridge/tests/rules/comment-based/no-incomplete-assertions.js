
const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should;

describe("incomplete assertions", function() {
  const value = 42;

  it("uses chai 'assert'", function() {
    assert.fail;  // Noncompliant {{Call this 'fail' assertion.}}
//         ^^^^
    should.throw;  // Noncompliant {{Call this 'throw' assertion.}}
  });

  it("uses chai 'expect'", function() {
    expect(1 == 1);  // Noncompliant  {{Complete this assertion; 'expect' doesn't assert anything by itself.}}
//  ^^^^^^
    expect(value.toString).to.throw;  // Noncompliant {{Call this 'throw' assertion.}}
//                            ^^^^^

  });
});

describe("incomplete assertions", function() {
  const value = 42;

  it("uses chai 'assert'", function() {
    assert.fail  // Noncompliant {{Call this 'fail' assertion.}}
  });

  it("uses chai 'expect'", function() {
    // "expect" without assertion
    expect(1 == 1)  // Noncompliant  {{Complete this assertion; 'expect' doesn't assert anything by itself.}}

    // qunit expects number argument
    expect( 10 ); // Compliant

    // Assertion ends with a chainable getter:
    // https://www.chaijs.com/api/bdd/#method_language-chains
    expect(value).to  // Noncompliant    {{Complete this assertion; 'to' doesn't assert anything by itself.}}
    expect(value).be  // Noncompliant    {{Complete this assertion; 'be' doesn't assert anything by itself.}}
    expect(value).been  // Noncompliant  {{Complete this assertion; 'been' doesn't assert anything by itself.}}
    expect(value).is  // Noncompliant  {{Complete this assertion; 'is' doesn't assert anything by itself.}}
    expect(value).that  // Noncompliant  {{Complete this assertion; 'that' doesn't assert anything by itself.}}
    expect(value).which  // Noncompliant  {{Complete this assertion; 'which' doesn't assert anything by itself.}}
    expect(value).and  // Noncompliant  {{Complete this assertion; 'and' doesn't assert anything by itself.}}
    expect(value).has  // Noncompliant  {{Complete this assertion; 'has' doesn't assert anything by itself.}}
    expect(value).have  // Noncompliant  {{Complete this assertion; 'have' doesn't assert anything by itself.}}
    expect(value).with  // Noncompliant  {{Complete this assertion; 'with' doesn't assert anything by itself.}}
    expect(value).at  // Noncompliant  {{Complete this assertion; 'at' doesn't assert anything by itself.}}
    expect(value).of  // Noncompliant  {{Complete this assertion; 'of' doesn't assert anything by itself.}}
    expect(value).same  // Noncompliant  {{Complete this assertion; 'same' doesn't assert anything by itself.}}
    expect(value).but  // Noncompliant  {{Complete this assertion; 'but' doesn't assert anything by itself.}}
    expect(value).does  // Noncompliant  {{Complete this assertion; 'does' doesn't assert anything by itself.}}
    expect(value).still  // Noncompliant  {{Complete this assertion; 'still' doesn't assert anything by itself.}}

    // Modifier functions
    expect(value).not  // Noncompliant    {{Complete this assertion; 'not' doesn't assert anything by itself.}}
    expect(value).deep  // Noncompliant  {{Complete this assertion; 'deep' doesn't assert anything by itself.}}
    expect(value).nested  // Noncompliant  {{Complete this assertion; 'nested' doesn't assert anything by itself.}}
    expect(value).own  // Noncompliant  {{Complete this assertion; 'own' doesn't assert anything by itself.}}
    expect(value).ordered  // Noncompliant  {{Complete this assertion; 'ordered' doesn't assert anything by itself.}}
    expect(value).any  // Noncompliant  {{Complete this assertion; 'any' doesn't assert anything by itself.}}
    expect(value).all  // Noncompliant  {{Complete this assertion; 'all' doesn't assert anything by itself.}}
    expect(value).itself  // Noncompliant  {{Complete this assertion; 'itself' doesn't assert anything by itself.}}

    // Those can obviously be chained
    expect(value).to.not.be.still  // Noncompliant  {{Complete this assertion; 'still' doesn't assert anything by itself.}}


    // Assertion function not called (and their aliased)
    expect(value).a  // Noncompliant  {{Call this 'a' assertion.}}
    expect(value).an  // Noncompliant  {{Call this 'an' assertion.}}
    expect(value).include  // Noncompliant  {{Call this 'include' assertion.}}
    expect(value).includes  // Noncompliant  {{Call this 'includes' assertion.}}
    expect(value).contain  // Noncompliant  {{Call this 'contain' assertion.}}
    expect(value).contains  // Noncompliant  {{Call this 'contains' assertion.}}
    expect(value).equal  // Noncompliant  {{Call this 'equal' assertion.}}
    expect(value).equals  // Noncompliant  {{Call this 'equals' assertion.}}
    expect(value).eq  // Noncompliant  {{Call this 'eq' assertion.}}
    expect(value).eql  // Noncompliant  {{Call this 'eql' assertion.}}
    expect(value).eqls  // Noncompliant  {{Call this 'eqls' assertion.}}
    expect(value).above  // Noncompliant  {{Call this 'above' assertion.}}
    expect(value).gt  // Noncompliant  {{Call this 'gt' assertion.}}
    expect(value).greaterThan  // Noncompliant  {{Call this 'greaterThan' assertion.}}
    expect(value).least  // Noncompliant  {{Call this 'least' assertion.}}
    expect(value).gte  // Noncompliant  {{Call this 'gte' assertion.}}
    expect(value).below  // Noncompliant  {{Call this 'below' assertion.}}
    expect(value).lt  // Noncompliant  {{Call this 'lt' assertion.}}
    expect(value).lessThan  // Noncompliant  {{Call this 'lessThan' assertion.}}
    expect(value).most  // Noncompliant  {{Call this 'most' assertion.}}
    expect(value).lte  // Noncompliant  {{Call this 'lte' assertion.}}
    expect(value).within  // Noncompliant  {{Call this 'within' assertion.}}
    expect(value).instanceof  // Noncompliant  {{Call this 'instanceof' assertion.}}
    expect(value).instanceOf  // Noncompliant  {{Call this 'instanceOf' assertion.}}
    expect(value).property  // Noncompliant  {{Call this 'property' assertion.}}
    expect(value).ownPropertyDescriptor  // Noncompliant  {{Call this 'ownPropertyDescriptor' assertion.}}
    expect(value).haveOwnPropertyDescriptor  // Noncompliant  {{Call this 'haveOwnPropertyDescriptor' assertion.}}
    expect(value).lengthOf  // Noncompliant  {{Call this 'lengthOf' assertion.}}
    expect(value).length  // Noncompliant  {{Call this 'length' assertion.}}
    expect(value).match  // Noncompliant  {{Call this 'match' assertion.}}
    expect(value).matches  // Noncompliant  {{Call this 'matches' assertion.}}
    expect(value).string  // Noncompliant  {{Call this 'string' assertion.}}
    expect(value).key  // Noncompliant  {{Call this 'key' assertion.}}
    expect(value).keys  // Noncompliant  {{Call this 'keys' assertion.}}
    expect(value).throw  // Noncompliant  {{Call this 'throw' assertion.}}
    expect(value).throws  // Noncompliant  {{Call this 'throws' assertion.}}
    expect(value).Throw  // Noncompliant  {{Call this 'Throw' assertion.}}
    expect(value).respondTo  // Noncompliant  {{Call this 'respondTo' assertion.}}
    expect(value).respondsTo  // Noncompliant  {{Call this 'respondsTo' assertion.}}
    expect(value).satisfy  // Noncompliant  {{Call this 'satisfy' assertion.}}
    expect(value).satisfies  // Noncompliant  {{Call this 'satisfies' assertion.}}
    expect(value).closeTo  // Noncompliant  {{Call this 'closeTo' assertion.}}
    expect(value).approximately  // Noncompliant  {{Call this 'approximately' assertion.}}
    expect(value).members  // Noncompliant  {{Call this 'members' assertion.}}
    expect(value).oneOf  // Noncompliant  {{Call this 'oneOf' assertion.}}
    expect(value).change  // Noncompliant  {{Call this 'change' assertion.}}
    expect(value).changes  // Noncompliant  {{Call this 'changes' assertion.}}
    expect(value).increase  // Noncompliant  {{Call this 'increase' assertion.}}
    expect(value).increases  // Noncompliant  {{Call this 'increases' assertion.}}
    expect(value).decrease  // Noncompliant  {{Call this 'decrease' assertion.}}
    expect(value).decreases  // Noncompliant  {{Call this 'decreases' assertion.}}
    expect(value).by  // Noncompliant  {{Call this 'by' assertion.}}
    expect.fail  // Noncompliant  {{Call this 'fail' assertion.}}

    class A {
      mymethod() {
        throw new Error("An Error");
      }
    }

    const a = new A()
    // These can also be chained
    expect(a).to.respondTo("mymethod").to.which.throws;  // Noncompliant  {{Call this 'throws' assertion.}}
  });

  it("uses chai 'should'", function() {
    // everything true for "except" is also true for "should"
    value.should;  // Noncompliant  {{Complete this assertion; 'should' doesn't assert anything by itself.}}
    value.should.not.be;  // Noncompliant  {{Complete this assertion; 'be' doesn't assert anything by itself.}}
    value.should.throw;  // Noncompliant  {{Call this 'throw' assertion.}}
    should.fail; // Noncompliant {{Call this 'fail' assertion.}}
    // ...
  });
});

describe("complete assertions", function() {
  const value = 42;

  it("uses chai 'assert'", function() {
    assert.fail();
  });

  it("uses chai 'expect'", function() {
    expect(1).to.equal(1);
    expect(value.toString).throw(TypeError);
  });

  it ('uses should', function() {
    foo.should.be.a('string');
    foo.should.equal('bar');
    foo.should.have.lengthOf(3);
    beverages.should.have.property('tea').with.lengthOf(3);
  });
});

foo().bar;

