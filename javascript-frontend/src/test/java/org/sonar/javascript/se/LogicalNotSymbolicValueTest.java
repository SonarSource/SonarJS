package org.sonar.javascript.se;

import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.Constraint.FALSY;
import static org.sonar.javascript.se.Constraint.TRUTHY;

public class LogicalNotSymbolicValueTest {

  private static final ProgramState EMPTY_STATE = ProgramState.emptyState();
  private Symbol symbol = mock(Symbol.class);

  @Test(expected = IllegalArgumentException.class)
  public void should_throw_on_null_negated_value() throws Exception {
    new LogicalNotSymbolicValue(null);
  }

  @Test
  public void constrain() throws Exception {
    ProgramState state1 = EMPTY_STATE.newSymbolicValue(symbol, null);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    SymbolicValue not = new LogicalNotSymbolicValue(sv1);
    assertThat(not.constrain(state1, TRUTHY)).containsExactly(state1.constrain(sv1, FALSY));
  }

  @Test
  public void to_string() throws Exception {
    ProgramState state1 = EMPTY_STATE.newSymbolicValue(symbol, null);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    SymbolicValue not = new LogicalNotSymbolicValue(sv1);
    assertThat(not.toString()).isEqualTo("!SV_1");
  }

}
