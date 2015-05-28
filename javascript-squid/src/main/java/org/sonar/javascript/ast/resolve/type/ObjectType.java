package org.sonar.javascript.ast.resolve.type;

import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;

public class ObjectType implements Type {

  private FunctionDeclarationTree functionDeclaration = null;

  @Override
  public boolean isCallable() {
    return functionDeclaration != null;
  }

  @Override
  public Kind kind() {
    if (isCallable()){
      return Kind.FUNCTION;
    } else {
      return Kind.OBJECT;
    }
  }

  protected ObjectType(){}

  public static ObjectType createFunction(FunctionDeclarationTree functionDeclaration){
    ObjectType objectType = new ObjectType();
    objectType.functionDeclaration = functionDeclaration;
    return objectType;
  }

  public static ObjectType create(){
    return new ObjectType();
  }

}
