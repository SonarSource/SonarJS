it('checks the status', () => {
  cy.get('[data-cy=status]').then($status => { // Noncompliant
    expect($status.text()).to.equal('Ready');
  });

  cy.get('input').then($input => {
    initializePlugin($input[0]);
  });
});
