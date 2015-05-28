package org.sonar.javascript.ast.resolve.type;

public enum Primitive implements Type {
  NUMBER {
    @Override
    public Kind kind() {
      return Kind.NUMBER;
    }
  },
  STRING {
    @Override
    public Kind kind() {
      return Kind.STRING;
    }
  },
  BOOLEAN {
    @Override
    public Kind kind() {
      return Kind.BOOLEAN;
    }
  };

  @Override
  public boolean isCallable() {
    return false;
  }
}
