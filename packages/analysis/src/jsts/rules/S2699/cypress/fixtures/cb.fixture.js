describe('cypress assertions', () => {
  it('recognizes cy.X().should()', () => { // Compliant
    cy.get('.greeting').should('have.text', 'Hello');
  });

  it('recognizes chained .and()', () => { // Compliant
    cy.get('a').should('have.attr', 'href').and('include', '/about');
  });

  it('recognizes nested chains', () => { // Compliant
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.a', 'string');
  });

  it('recognizes global expect from chai-style cypress assertions', () => { // Compliant
    expect(1).to.equal(1);
  });

  it('should recognize issue', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    cy.visit('/');
  });
});
