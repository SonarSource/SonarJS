package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import java.util.List;

public class SimpleSymbolicValue implements SymbolicValue {

  private final int id;

  SimpleSymbolicValue(int id) {
    this.id = id;
  }

  @Override
  public String toString() {
    return "SV_" + id;
  }

  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    ProgramState newState = state.constrain(this, constraint);
    if (newState == null) {
      return ImmutableList.of();
    }
    return ImmutableList.of(newState);
  }


}
