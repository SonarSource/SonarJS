package org.sonar.javascript.se;

import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.Constraint.TRUTHY;

public class SymbolicValueTest {

  private static final ProgramState EMPTY_STATE = ProgramState.emptyState();
  private Symbol symbol = mock(Symbol.class);

  @Test
  public void constrain() throws Exception {
    ProgramState state1 = EMPTY_STATE.newSymbolicValue(symbol, null);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    assertThat(sv1.constrain(state1, TRUTHY)).containsExactly(state1.constrain(sv1, TRUTHY));
  }
  
  @Test
  public void constrain_with_unreachable_constraint() throws Exception {
    ProgramState state1 = EMPTY_STATE.newSymbolicValue(symbol, Constraint.FALSY);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    assertThat(sv1.constrain(state1, TRUTHY)).isEmpty();
  }

}
