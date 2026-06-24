// flagged: cypress assertion at module top level
cy.get('.status').should('be.visible'); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe('cypress', () => {
  // flagged: directly in the describe body; reported once despite .should().and()
  cy.get('a').should('have.text', 't').and('include', 'x'); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  it('asserts inside a test', () => {
    cy.get('.greeting').should('have.text', 'Hello'); // Compliant
  });

  beforeEach(() => {
    cy.get('.app').should('exist'); // Compliant
  });
});
