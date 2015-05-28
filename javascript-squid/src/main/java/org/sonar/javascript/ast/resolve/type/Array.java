package org.sonar.javascript.ast.resolve.type;

public class Array extends ObjectType {

  public static Array create(){
    return new Array();
  }

  @Override
  public boolean isCallable() {
    return false;
  }

  @Override
  public Kind kind() {
    return Kind.ARRAY;
  }
}
