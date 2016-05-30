package org.sonar.javascript.se;

import com.google.common.base.Preconditions;
import java.util.List;

public class LogicalNotSymbolicValue implements SymbolicValue {

  private final SymbolicValue negatedValue;

  public LogicalNotSymbolicValue(SymbolicValue negatedValue) {
    Preconditions.checkArgument(negatedValue != null, "negatedValue should not be null");
    this.negatedValue = negatedValue;
  }

  @Override
  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    return negatedValue.constrain(state, constraint.not());
  }

  @Override
  public String toString() {
    return "!" + negatedValue;
  }

}
